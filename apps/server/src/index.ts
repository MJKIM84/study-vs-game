import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import { QUESTION_BANK } from "./questionBank.js";

const PORT = Number(process.env.PORT ?? 5174);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});

type Grade = 1 | 2 | 3;
type Subject = "math" | "english";

type Question = {
  id: string;
  prompt: string;
  answer: string;
};

type PublicQuestion = {
  id: string;
  prompt: string;
};

type Player = {
  id: string;
  name: string;
  socketId: string;
  ready: boolean;
  correct: number;
  index: number; // current question index
  lastSubmitAt?: number;
  finishedAt?: number;
};

type Room = {
  code: string;
  players: Record<string, Player>;
  started: boolean;
  totalQuestions: number;
  grade: Grade;
  subject: Subject;
  seed?: number;
  questions?: Question[];
  startAt?: number;
};

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);
const rooms = new Map<string, Room>();

function randomAnonName() {
  const a = ["용감한", "똑똑한", "빠른", "상냥한", "멋진", "집중하는"]; 
  const b = ["고양이", "토끼", "호랑이", "여우", "펭귄", "돌고래"]; 
  return `${a[Math.floor(Math.random() * a.length)]} ${b[Math.floor(Math.random() * b.length)]}`;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffleInPlace<T>(rng: () => number, arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function generateQuestions(opts: { grade: Grade; subject: Subject; total: number; seed: number }): Question[] {
  const rng = mulberry32(opts.seed);

  const source =
    opts.subject === "math" ? QUESTION_BANK.math[opts.grade] : QUESTION_BANK.english[opts.grade];

  const pool = source.slice();
  shuffleInPlace(rng, pool);

  // If total exceeds bank size, wrap (MVP safety)
  const out: Question[] = [];
  for (let i = 0; i < opts.total; i++) {
    const q = pool[i % pool.length];
    out.push({ id: q.id, prompt: q.prompt, answer: q.answer });
  }
  return out;
}

function getOrCreateRoom(code?: string): Room {
  if (code) {
    const r = rooms.get(code);
    if (r) return r;
  }
  const newCode = nanoid();
  const room: Room = {
    code: newCode,
    players: {},
    started: false,
    totalQuestions: 10,
    grade: 1,
    subject: "math",
  };
  rooms.set(newCode, room);
  return room;
}

function roomState(room: Room) {
  const players = Object.values(room.players).map((p) => ({
    id: p.id,
    name: p.name,
    ready: p.ready,
    correct: p.correct,
    index: p.index,
    lastSubmitAt: p.lastSubmitAt ?? null,
    finishedAt: p.finishedAt ?? null,
  }));
  return {
    code: room.code,
    players,
    started: room.started,
    totalQuestions: room.totalQuestions,
    grade: room.grade,
    subject: room.subject,
    startAt: room.startAt ?? null,
  };
}

io.on("connection", (socket) => {
  const playerId = socket.id;
  const name = randomAnonName();

  socket.on(
    "room:create",
    (
      {
        totalQuestions,
        grade,
        subject,
      }: { totalQuestions?: number; grade?: Grade; subject?: Subject } = {},
    ) => {
      const room = getOrCreateRoom();
      room.totalQuestions = totalQuestions ?? room.totalQuestions;
      room.grade = grade ?? room.grade;
      room.subject = subject ?? room.subject;

      room.players[playerId] = {
        id: playerId,
        name,
        socketId: socket.id,
        ready: false,
        correct: 0,
        index: 0,
      };

      socket.join(room.code);
      io.to(room.code).emit("room:state", roomState(room));
    },
  );

  socket.on("room:join", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room) {
      socket.emit("error:toast", { message: "방 코드를 찾을 수 없어요." });
      return;
    }
    if (Object.keys(room.players).length >= 2) {
      socket.emit("error:toast", { message: "방이 꽉 찼어요." });
      return;
    }

    room.players[playerId] = {
      id: playerId,
      name,
      socketId: socket.id,
      ready: false,
      correct: 0,
      index: 0,
    };
    socket.join(room.code);
    io.to(room.code).emit("room:state", roomState(room));
  });

  socket.on("player:ready", ({ code, ready }: { code: string; ready: boolean }) => {
    const room = rooms.get(code);
    if (!room) return;
    const p = room.players[playerId];
    if (!p) return;
    p.ready = ready;

    const players = Object.values(room.players);
    const allReady = players.length === 2 && players.every((x) => x.ready);
    if (allReady && !room.started) {
      room.started = true;
      room.seed = Math.floor(Math.random() * 2 ** 31);
      room.questions = generateQuestions({
        grade: room.grade,
        subject: room.subject,
        total: room.totalQuestions,
        seed: room.seed,
      });
      room.startAt = Date.now() + 3000;

      io.to(room.code).emit("game:countdown", { startAt: room.startAt });
      const publicQuestions: PublicQuestion[] = (room.questions ?? []).map((q) => ({
        id: q.id,
        prompt: q.prompt,
      }));
      io.to(room.code).emit("game:questions", {
        seed: room.seed,
        questions: publicQuestions,
        timeLimitSec: room.totalQuestions === 10 ? 60 : 120,
      });
      io.to(room.code).emit("room:state", roomState(room));
    } else {
      io.to(room.code).emit("room:state", roomState(room));
    }
  });

  function finishGame(room: Room, reason: "completed" | "timeout") {
    const players = Object.values(room.players);
    if (players.length < 2) return;

    // Rule (Claude 추천): correct 우선 → 동점이면 lastSubmitAt 빠른 쪽
    const a = players[0];
    const b = players[1];

    let winnerId: string | null = null;
    if (a.correct !== b.correct) winnerId = a.correct > b.correct ? a.id : b.id;
    else {
      const at = a.lastSubmitAt ?? Infinity;
      const bt = b.lastSubmitAt ?? Infinity;
      if (at !== bt) winnerId = at < bt ? a.id : b.id;
      else winnerId = null;
    }

    io.to(room.code).emit("game:finish", {
      winnerId,
      reason,
      scores: {
        [a.id]: { correct: a.correct, finishedAt: a.finishedAt ?? null, lastSubmitAt: a.lastSubmitAt ?? null },
        [b.id]: { correct: b.correct, finishedAt: b.finishedAt ?? null, lastSubmitAt: b.lastSubmitAt ?? null },
      },
    });

    room.started = false;
    room.startAt = undefined;
    room.seed = undefined;
    room.questions = undefined;
    for (const pl of Object.values(room.players)) {
      pl.ready = false;
      pl.correct = 0;
      pl.index = 0;
      pl.lastSubmitAt = undefined;
      pl.finishedAt = undefined;
    }
    io.to(room.code).emit("room:state", roomState(room));
  }

  socket.on(
    "game:submit",
    ({ code, qi, answer }: { code: string; qi: number; answer: string }) => {
      const room = rooms.get(code);
      if (!room || !room.started) return;
      const p = room.players[playerId];
      if (!p) return;
      if (!room.questions) return;

      const q = room.questions[qi];
      if (!q) return;
      if (qi !== p.index) return; // basic anti-desync

      const submittedAt = Date.now();
      p.lastSubmitAt = submittedAt;

      const normalized = String(answer ?? "").trim();
      const expected = String(q.answer).trim();
      const correct = room.subject === "english" ? normalized.toLowerCase() === expected.toLowerCase() : normalized === expected;

      if (correct) p.correct += 1;
      p.index = Math.min(p.index + 1, room.totalQuestions);
      if (p.index >= room.totalQuestions) p.finishedAt = submittedAt;

      io.to(room.code).emit("room:state", roomState(room));

      const players = Object.values(room.players);
      const allDone = players.length === 2 && players.every((pl) => pl.index >= room.totalQuestions);
      if (allDone) finishGame(room, "completed");
    },
  );

  socket.on("game:timeout", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room || !room.started) return;
    finishGame(room, "timeout");
  });

  socket.on("disconnect", () => {
    // remove player from any room
    for (const room of rooms.values()) {
      if (room.players[playerId]) {
        delete room.players[playerId];
        io.to(room.code).emit("room:state", roomState(room));
        if (Object.keys(room.players).length === 0) rooms.delete(room.code);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] allowed origin: ${CLIENT_ORIGIN}`);
});
