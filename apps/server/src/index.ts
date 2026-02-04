import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";

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

type Player = {
  id: string;
  name: string;
  socketId: string;
  ready: boolean;
  correct: number;
  index: number; // current question index
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

function generateQuestions(opts: { grade: Grade; subject: Subject; total: number; seed: number }): Question[] {
  const rng = mulberry32(opts.seed);
  const qs: Question[] = [];

  const makeId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

  if (opts.subject === "math") {
    for (let i = 0; i < opts.total; i++) {
      if (opts.grade === 1) {
        const a = Math.floor(rng() * 10) + 1;
        const b = Math.floor(rng() * 10) + 1;
        qs.push({ id: makeId(), prompt: `${a} + ${b} = ?`, answer: String(a + b) });
      } else if (opts.grade === 2) {
        const a = Math.floor(rng() * 50) + 10;
        const b = Math.floor(rng() * 50) + 1;
        const isAdd = rng() > 0.4;
        if (isAdd) qs.push({ id: makeId(), prompt: `${a} + ${b} = ?`, answer: String(a + b) });
        else qs.push({ id: makeId(), prompt: `${a} - ${b} = ?`, answer: String(a - b) });
      } else {
        const a = Math.floor(rng() * 8) + 2;
        const b = Math.floor(rng() * 9) + 1;
        qs.push({ id: makeId(), prompt: `${a} × ${b} = ?`, answer: String(a * b) });
      }
    }
    return qs;
  }

  // english: Korean meaning -> type English word (lowercase)
  const vocab: Record<Grade, Array<{ ko: string; en: string }>> = {
    1: [
      { ko: "고양이", en: "cat" },
      { ko: "개", en: "dog" },
      { ko: "사과", en: "apple" },
      { ko: "책", en: "book" },
      { ko: "학교", en: "school" },
      { ko: "물", en: "water" },
      { ko: "빨강", en: "red" },
      { ko: "파랑", en: "blue" },
    ],
    2: [
      { ko: "바나나", en: "banana" },
      { ko: "친구", en: "friend" },
      { ko: "가족", en: "family" },
      { ko: "행복한", en: "happy" },
      { ko: "작은", en: "small" },
      { ko: "큰", en: "big" },
      { ko: "달리다", en: "run" },
      { ko: "먹다", en: "eat" },
    ],
    3: [
      { ko: "아침", en: "morning" },
      { ko: "저녁", en: "evening" },
      { ko: "공원", en: "park" },
      { ko: "연필", en: "pencil" },
      { ko: "읽다", en: "read" },
      { ko: "쓰다", en: "write" },
      { ko: "공부하다", en: "study" },
      { ko: "놀다", en: "play" },
    ],
  };

  for (let i = 0; i < opts.total; i++) {
    const w = pick(rng, vocab[opts.grade]);
    qs.push({ id: makeId(), prompt: `"${w.ko}"를 영어로 쓰세요`, answer: w.en });
  }
  return qs;
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
      io.to(room.code).emit("game:questions", {
        seed: room.seed,
        questions: room.questions,
        timeLimitSec: room.totalQuestions === 10 ? 60 : 120,
      });
      io.to(room.code).emit("room:state", roomState(room));
    } else {
      io.to(room.code).emit("room:state", roomState(room));
    }
  });

  socket.on(
    "game:answer",
    ({ code, correct }: { code: string; correct: boolean }) => {
      const room = rooms.get(code);
      if (!room || !room.started) return;
      const p = room.players[playerId];
      if (!p) return;

      if (correct) p.correct += 1;
      p.index = Math.min(p.index + 1, room.totalQuestions);

      io.to(room.code).emit("room:state", roomState(room));

      // win condition: first to finish all questions (regardless of accuracy for now)
      if (p.index >= room.totalQuestions) {
        io.to(room.code).emit("game:finish", {
          winnerId: p.id,
          reason: "completed",
        });
        room.started = false;
        room.startAt = undefined;
        room.seed = undefined;
        room.questions = undefined;
        for (const pl of Object.values(room.players)) {
          pl.ready = false;
          pl.correct = 0;
          pl.index = 0;
        }
        io.to(room.code).emit("room:state", roomState(room));
      }
    },
  );

  socket.on("game:timeout", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room || !room.started) return;
    const loser = room.players[playerId];
    if (!loser) return;
    const winner = Object.values(room.players).find((pl) => pl.id !== loser.id);
    if (!winner) return;

    io.to(room.code).emit("game:finish", { winnerId: winner.id, reason: "timeout" });

    room.started = false;
    room.startAt = undefined;
    room.seed = undefined;
    room.questions = undefined;
    for (const pl of Object.values(room.players)) {
      pl.ready = false;
      pl.correct = 0;
      pl.index = 0;
    }
    io.to(room.code).emit("room:state", roomState(room));
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
