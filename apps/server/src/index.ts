import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import { loadQuestionBank } from "./bankLoad.js";
import { type Semester } from "./bankSchema.js";
import { getMe, postLogin, postSignup, requireAuth } from "./httpAuthRoutes.js";
import { leaderboard, recordMatchAndUpdateRatings, modeKey } from "./ratings.js";
import { verifyToken } from "./auth.js";
import { getMeStats } from "./meRoutes.js";

const PORT = Number(process.env.PORT ?? 5174);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));

// Auth (JWT bearer)
app.post("/auth/signup", postSignup);
app.post("/auth/login", postLogin);
app.get("/auth/me", getMe);
app.get("/me/stats", requireAuth, getMeStats);

// Leaderboard
app.get("/leaderboard", async (req, res) => {
  const grade = Number(req.query.grade ?? 1);
  const subject = String(req.query.subject ?? "math");
  const semester = String(req.query.semester ?? "all");
  const totalQuestions = Number(req.query.totalQuestions ?? 10);

  const mk = modeKey({ grade, subject, semester, totalQuestions });
  const rows = await leaderboard({ modeKey: mk, limit: 50 });
  res.json({ ok: true, modeKey: mk, rows });
});

// Bank metadata for UI (unit codes, counts)
app.get("/bank/meta", (req, res) => {
  const grade = Number(req.query.grade ?? 1) as 1 | 2 | 3;
  const subject = (String(req.query.subject ?? "math") as "math" | "english");
  const semester = (String(req.query.semester ?? "all") as "all" | "1" | "2");

  const src = subject === "math" ? BANK.math[grade] : BANK.english[grade];
  const filtered =
    semester === "all" ? src : src.filter((q) => q.semester === Number(semester));

  const byUnit: Record<string, { count: number; tags: string[]; semesters: number[] }> = {};
  for (const q of filtered) {
    byUnit[q.unitCode] ??= { count: 0, tags: [], semesters: [] };
    byUnit[q.unitCode].count += 1;
    for (const t of q.tags) if (!byUnit[q.unitCode].tags.includes(t)) byUnit[q.unitCode].tags.push(t);
    if (!byUnit[q.unitCode].semesters.includes(q.semester)) byUnit[q.unitCode].semesters.push(q.semester);
  }

  const units = Object.entries(byUnit)
    .map(([unitCode, v]) => ({ unitCode, ...v }))
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode));

  res.json({
    grade,
    subject,
    semester,
    totalQuestions: filtered.length,
    units,
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});

type Grade = 1 | 2 | 3;
type Subject = "math" | "english";

const BANK = loadQuestionBank().bank;

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
  userId?: string;
  username?: string;
  nickname?: string;
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
  semester: Semester | "all";
  excludeUnitCodes: string[];
  seed?: number;
  questions?: Question[];
  startAt?: number;
};

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);
const rooms = new Map<string, Room>();

// Simple matchmaking queue (MVP): pairs players by (grade, subject, totalQuestions)
// NOTE: no persistence; best-effort cleanup on disconnect.
const queues = new Map<string, string[]>();
function queueKey(opts: { grade: Grade; subject: Subject; totalQuestions: number }) {
  return `${opts.grade}:${opts.subject}:${opts.totalQuestions}`;
}
function queueRemove(socketId: string) {
  for (const [k, arr] of queues) {
    const idx = arr.indexOf(socketId);
    if (idx >= 0) {
      arr.splice(idx, 1);
      if (arr.length === 0) queues.delete(k);
    }
  }
}

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

function generateQuestions(opts: {
  grade: Grade;
  subject: Subject;
  total: number;
  seed: number;
  semester: Semester | "all";
  excludeUnitCodes: string[];
}): Question[] {
  const rng = mulberry32(opts.seed);

  const source = opts.subject === "math" ? BANK.math[opts.grade] : BANK.english[opts.grade];

  const exclude = new Set(opts.excludeUnitCodes ?? []);
  let pool = source.filter((q) => !exclude.has(q.unitCode));
  if (opts.semester !== "all") pool = pool.filter((q) => q.semester === opts.semester);

  // Fallback: if filters removed everything, revert to full source
  if (pool.length === 0) pool = source.slice();

  const shuffled = pool.slice();
  shuffleInPlace(rng, shuffled);

  // If total exceeds pool size, wrap (MVP safety)
  const out: Question[] = [];
  for (let i = 0; i < opts.total; i++) {
    const q = shuffled[i % shuffled.length];
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
    semester: "all",
    excludeUnitCodes: [],
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
    semester: room.semester,
    excludeUnitCodes: room.excludeUnitCodes,
    startAt: room.startAt ?? null,
  };
}

io.on("connection", async (socket) => {
  const playerId = socket.id;
  const anonName = randomAnonName();

  // Optional auth: client may send JWT in handshake auth
  const token = (socket.handshake.auth as any)?.token as string | undefined;
  const authed = token ? await verifyToken(token) : null;
  const name = authed?.nickname ?? anonName;

  // Make sure this socket isn't lingering in a queue (defensive)
  queueRemove(socket.id);

  socket.on(
    "room:create",
    (
      {
        totalQuestions,
        grade,
        subject,
        semester,
        excludeUnitCodes,
      }: {
        totalQuestions?: number;
        grade?: Grade;
        subject?: Subject;
        semester?: Semester | "all";
        excludeUnitCodes?: string[];
      } = {},
    ) => {
      // Leaving matchmaking queue if any
      queueRemove(socket.id);

      const room = getOrCreateRoom();
      room.totalQuestions = totalQuestions ?? room.totalQuestions;
      room.grade = grade ?? room.grade;
      room.subject = subject ?? room.subject;
      room.semester = semester ?? room.semester;
      room.excludeUnitCodes = excludeUnitCodes ?? room.excludeUnitCodes;

      room.players[playerId] = {
        id: playerId,
        name,
        socketId: socket.id,
        userId: authed?.id,
        username: authed?.username,
        nickname: authed?.nickname,
        ready: false,
        correct: 0,
        index: 0,
      };

      socket.join(room.code);
      io.to(room.code).emit("room:state", roomState(room));
    },
  );

  socket.on("room:join", ({ code }: { code: string }) => {
    // Leaving matchmaking queue if any
    queueRemove(socket.id);

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
      userId: authed?.id,
      username: authed?.username,
      nickname: authed?.nickname,
      ready: false,
      correct: 0,
      index: 0,
    };
    socket.join(room.code);
    io.to(room.code).emit("room:state", roomState(room));
  });

  // Matchmaking (quick play)
  socket.on(
    "queue:join",
    async (
      { totalQuestions, grade, subject }: { totalQuestions?: number; grade?: Grade; subject?: Subject } = {},
    ) => {
      queueRemove(socket.id);

      const g: Grade = grade ?? 1;
      const s: Subject = subject ?? "math";
      const t = totalQuestions ?? 10;

      const key = queueKey({ grade: g, subject: s, totalQuestions: t });
      const arr = queues.get(key) ?? [];
      if (!queues.has(key)) queues.set(key, arr);

      // Prevent duplicates
      if (!arr.includes(socket.id)) arr.push(socket.id);

      // Matched!
      if (arr.length >= 2) {
        const aId = arr.shift()!;
        const bId = arr.shift()!;
        if (arr.length === 0) queues.delete(key);

        const aSock = io.sockets.sockets.get(aId);
        const bSock = io.sockets.sockets.get(bId);
        if (!aSock || !bSock) {
          // best-effort cleanup; requeue the live one
          if (aSock && !arr.includes(aId)) arr.unshift(aId);
          if (bSock && !arr.includes(bId)) arr.unshift(bId);
          queues.set(key, arr);
          return;
        }

        const room = getOrCreateRoom();
        room.totalQuestions = t;
        room.grade = g;
        room.subject = s;
        room.semester = "all";
        room.excludeUnitCodes = [];

        const aName = randomAnonName();
        const bName = randomAnonName();

        const aToken = (aSock.handshake.auth as any)?.token as string | undefined;
        const bToken = (bSock.handshake.auth as any)?.token as string | undefined;
        const aAuthed = aToken ? await verifyToken(aToken) : null;
        const bAuthed = bToken ? await verifyToken(bToken) : null;

        room.players[aId] = {
          id: aId,
          name: aAuthed?.nickname ?? aName,
          socketId: aId,
          userId: aAuthed?.id,
          username: aAuthed?.username,
          nickname: aAuthed?.nickname,
          ready: false,
          correct: 0,
          index: 0,
        };
        room.players[bId] = {
          id: bId,
          name: bAuthed?.nickname ?? bName,
          socketId: bId,
          userId: bAuthed?.id,
          username: bAuthed?.username,
          nickname: bAuthed?.nickname,
          ready: false,
          correct: 0,
          index: 0,
        };

        aSock.join(room.code);
        bSock.join(room.code);

        io.to(room.code).emit("room:state", roomState(room));
        io.to(room.code).emit("queue:matched", { code: room.code });
      }
    },
  );

  socket.on("queue:leave", () => {
    queueRemove(socket.id);
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
        semester: room.semester,
        excludeUnitCodes: room.excludeUnitCodes,
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

  async function finishGame(room: Room, reason: "completed" | "timeout") {
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

    // Persist match + ratings (only for authenticated users)
    const winnerUserId = winnerId ? room.players[winnerId]?.userId ?? null : null;
    try {
      await recordMatchAndUpdateRatings({
        createdByUserId: a.userId ?? b.userId ?? null,
        grade: room.grade,
        subject: room.subject,
        semester: String(room.semester),
        totalQuestions: room.totalQuestions,
        seed: room.seed ?? null,
        reason,
        winnerUserId,
        players: [
          {
            socketId: a.socketId,
            userId: a.userId ?? null,
            username: a.username ?? null,
            nickname: a.nickname ?? null,
            correct: a.correct,
            lastSubmitAt: a.lastSubmitAt ?? null,
            finishedAt: a.finishedAt ?? null,
          },
          {
            socketId: b.socketId,
            userId: b.userId ?? null,
            username: b.username ?? null,
            nickname: b.nickname ?? null,
            correct: b.correct,
            lastSubmitAt: b.lastSubmitAt ?? null,
            finishedAt: b.finishedAt ?? null,
          },
        ],
      });
    } catch (e) {
      console.warn("[db] failed to record match", e);
    }

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
      if (allDone) void finishGame(room, "completed");
    },
  );

  socket.on("game:timeout", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room || !room.started) return;
    void finishGame(room, "timeout");
  });

  socket.on("disconnect", () => {
    // leave matchmaking queue
    queueRemove(socket.id);

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
