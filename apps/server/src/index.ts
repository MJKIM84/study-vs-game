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
import { getMyMatches } from "./matchRoutes.js";
import { listBadges, listMyBadges, seedBadges, grantBadge } from "./badges.js";

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
app.get("/me/matches", requireAuth, getMyMatches);
app.get("/me/badges", requireAuth, async (req, res) => {
  const u = (req as any).user as { id: string } | undefined;
  if (!u?.id) return res.status(401).json({ ok: false, error: "unauthorized" });
  const badges = await listMyBadges(u.id);
  res.json({ ok: true, badges });
});

// Badge catalog (public)
app.get("/badges", async (_req, res) => {
  const badges = await listBadges();
  res.json({ ok: true, badges });
});

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
  const grade = Number(req.query.grade ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
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

type Grade = 1 | 2 | 3 | 4 | 5 | 6;
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
  finished: boolean;
  isSolo: boolean;
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

// Simple matchmaking queue (MVP): pairs players by (grade, subject, totalQuestions, semester)
// NOTE: no persistence; best-effort cleanup on disconnect.
type QueueEntry = {
  socketId: string;
  semester: Semester | "all";
  excludeUnitCodes: string[];
};
const queues = new Map<string, QueueEntry[]>();
function queueKey(opts: { grade: Grade; subject: Subject; totalQuestions: number; semester: Semester | "all" }) {
  return `${opts.grade}:${opts.subject}:${opts.totalQuestions}:${opts.semester}`;
}
function queueRemove(socketId: string) {
  for (const [k, arr] of queues) {
    const idx = arr.findIndex((x) => x.socketId === socketId);
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
    finished: false,
    isSolo: false,
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
    finished: room.finished,
    isSolo: room.isSolo,
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
        solo,
      }: {
        totalQuestions?: number;
        grade?: Grade;
        subject?: Subject;
        semester?: Semester | "all";
        excludeUnitCodes?: string[];
        solo?: boolean;
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
      room.isSolo = Boolean(solo);
      room.finished = false;

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
    // If someone joins, it's no longer a solo practice room.
    room.isSolo = false;
    socket.join(room.code);
    io.to(room.code).emit("room:state", roomState(room));
  });

  // Matchmaking (quick play)
  socket.on(
    "queue:join",
    async (
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
      queueRemove(socket.id);

      const g: Grade = grade ?? 1;
      const s: Subject = subject ?? "math";
      const t = totalQuestions ?? 10;
      const sem: Semester | "all" = semester ?? "all";
      const ex: string[] = excludeUnitCodes ?? [];

      const key = queueKey({ grade: g, subject: s, totalQuestions: t, semester: sem });
      const arr = queues.get(key) ?? [];
      if (!queues.has(key)) queues.set(key, arr);

      // Prevent duplicates
      if (!arr.some((x) => x.socketId === socket.id)) arr.push({ socketId: socket.id, semester: sem, excludeUnitCodes: ex });

      // Matched!
      if (arr.length >= 2) {
        const a = arr.shift()!;
        const b = arr.shift()!;
        if (arr.length === 0) queues.delete(key);

        const aSock = io.sockets.sockets.get(a.socketId);
        const bSock = io.sockets.sockets.get(b.socketId);
        if (!aSock || !bSock) {
          // best-effort cleanup; requeue the live one
          if (aSock && !arr.some((x) => x.socketId === a.socketId)) arr.unshift(a);
          if (bSock && !arr.some((x) => x.socketId === b.socketId)) arr.unshift(b);
          queues.set(key, arr);
          return;
        }

        const room = getOrCreateRoom();
        room.totalQuestions = t;
        room.grade = g;
        room.subject = s;
        room.semester = sem;
        room.isSolo = false;
        room.finished = false;

        // Exclude union (safer: avoid giving either player unlearned units)
        room.excludeUnitCodes = Array.from(new Set([...(a.excludeUnitCodes ?? []), ...(b.excludeUnitCodes ?? [])]));

        const aName = randomAnonName();
        const bName = randomAnonName();

        const aToken = (aSock.handshake.auth as any)?.token as string | undefined;
        const bToken = (bSock.handshake.auth as any)?.token as string | undefined;
        const aAuthed = aToken ? await verifyToken(aToken) : null;
        const bAuthed = bToken ? await verifyToken(bToken) : null;

        room.players[a.socketId] = {
          id: a.socketId,
          name: aAuthed?.nickname ?? aName,
          socketId: a.socketId,
          userId: aAuthed?.id,
          username: aAuthed?.username,
          nickname: aAuthed?.nickname,
          ready: false,
          correct: 0,
          index: 0,
        };
        room.players[b.socketId] = {
          id: b.socketId,
          name: bAuthed?.nickname ?? bName,
          socketId: b.socketId,
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
    const readyToStart =
      (!room.isSolo && players.length === 2 && players.every((x) => x.ready)) ||
      (room.isSolo && players.length === 1 && players.every((x) => x.ready));

    if (readyToStart && !room.started && !room.finished) {
      room.started = true;
      room.finished = false;
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
        timeLimitSec: timeLimitSecForRoom(room),
      });
      io.to(room.code).emit("room:state", roomState(room));
    } else {
      io.to(room.code).emit("room:state", roomState(room));
    }
  });

  function timeLimitSecForRoom(room: Room) {
    return room.totalQuestions === 10 ? 60 : 120;
  }

  async function finishGame(
    room: Room,
    reason: "completed" | "timeout" | "disconnect",
    winnerIdOverride?: string | null,
  ) {
    if (room.finished) return;

    const players = Object.values(room.players);
    if (!room.isSolo && players.length < 2) return;
    if (room.isSolo && players.length < 1) return;

    const a = players[0];
    const b = players[1];

    let winnerId: string | null = winnerIdOverride ?? null;

    if (!room.isSolo && !winnerId) {
      // Rule: correct 우선 → 동점이면 lastSubmitAt 빠른 쪽
      if (a.correct !== b.correct) winnerId = a.correct > b.correct ? a.id : b.id;
      else {
        const at = a.lastSubmitAt ?? Infinity;
        const bt = b.lastSubmitAt ?? Infinity;
        if (at !== bt) winnerId = at < bt ? a.id : b.id;
        else winnerId = null;
      }
    }

    io.to(room.code).emit("game:finish", {
      winnerId,
      reason,
      scores: {
        ...(a
          ? {
              [a.id]: { correct: a.correct, finishedAt: a.finishedAt ?? null, lastSubmitAt: a.lastSubmitAt ?? null },
            }
          : {}),
        ...(b
          ? {
              [b.id]: { correct: b.correct, finishedAt: b.finishedAt ?? null, lastSubmitAt: b.lastSubmitAt ?? null },
            }
          : {}),
      },
    });

    // Persist match + ratings (only for authenticated users, and only for PvP)
    if (!room.isSolo && players.length >= 2) {
      const winnerUserId = winnerId ? room.players[winnerId]?.userId ?? null : null;

      const grantAndNotify = async (
        socketId: string,
        userId: string | null | undefined,
        badgeCode: string,
      ) => {
        if (!userId) return;
        const earned = await grantBadge(userId, badgeCode);
        if (!earned) return;
        io.to(socketId).emit("badge:earned", {
          code: earned.badge.code,
          name: earned.badge.name,
          description: earned.badge.description,
          icon: earned.badge.icon,
          rarity: earned.badge.rarity,
          earnedAt: earned.createdAt,
        });
      };

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

        // Badge awards (MVP): server-verified
        if (winnerId && winnerUserId) {
          const winnerSocket = room.players[winnerId]?.socketId;
          if (winnerSocket) await grantAndNotify(winnerSocket, winnerUserId, "FIRST_WIN");
        }

        for (const p of [a, b]) {
          // Perfect game
          if (p.userId && p.correct >= room.totalQuestions) {
            await grantAndNotify(p.socketId, p.userId, "PERFECT_GAME");
          }
          // Fast finish: finish in under 50% of time limit (and completed)
          if (p.userId && p.finishedAt && room.startAt) {
            const durMs = p.finishedAt - room.startAt;
            if (durMs > 0 && durMs <= timeLimitSecForRoom(room) * 1000 * 0.5) {
              await grantAndNotify(p.socketId, p.userId, "FAST_FINISH");
            }
          }
        }
      } catch (e) {
        console.warn("[db] failed to record match", e);
      }
    }

    room.finished = true;
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
      if (!room || !room.started || room.finished) return;
      const p = room.players[playerId];
      if (!p) return;
      if (!room.questions) return;
      if (!room.startAt) return;

      const now = Date.now();

      // Don't accept answers before countdown ends.
      if (now < room.startAt) return;

      // Server-side timeout safety.
      const endAt = room.startAt + timeLimitSecForRoom(room) * 1000;
      if (now >= endAt) {
        void finishGame(room, "timeout");
        return;
      }

      const q = room.questions[qi];
      if (!q) return;
      if (qi !== p.index) return; // basic anti-desync

      // Simple anti-spam
      if (p.lastSubmitAt && now - p.lastSubmitAt < 120) return;

      p.lastSubmitAt = now;

      const normalized = String(answer ?? "").trim().slice(0, 64);
      const expected = String(q.answer).trim();
      const correct =
        room.subject === "english"
          ? normalized.toLowerCase() === expected.toLowerCase()
          : normalized === expected;

      if (correct) p.correct += 1;
      p.index = Math.min(p.index + 1, room.totalQuestions);
      if (p.index >= room.totalQuestions) p.finishedAt = now;

      // Send instant feedback to the submitter only (UX)
      socket.emit("game:answer", { qi, correct });

      io.to(room.code).emit("room:state", roomState(room));

      const players = Object.values(room.players);
      const allDone = room.isSolo
        ? players.length === 1 && players.every((pl) => pl.index >= room.totalQuestions)
        : players.length === 2 && players.every((pl) => pl.index >= room.totalQuestions);

      if (allDone) void finishGame(room, "completed");
    },
  );

  socket.on("game:timeout", ({ code }: { code: string }) => {
    const room = rooms.get(code);
    if (!room || !room.started || room.finished) return;
    void finishGame(room, "timeout");
  });

  socket.on("disconnect", () => {
    // leave matchmaking queue
    queueRemove(socket.id);

    // remove player from any room
    for (const room of rooms.values()) {
      if (!room.players[playerId]) continue;

      const wasInGame = room.started && !room.finished;
      delete room.players[playerId];

      // If PvP and someone disconnects mid-game, remaining player wins by default.
      if (wasInGame && !room.isSolo) {
        const remaining = Object.values(room.players);
        if (remaining.length === 1) {
          void finishGame(room, "disconnect", remaining[0].id);
          continue;
        }
      }

      io.to(room.code).emit("room:state", roomState(room));
      if (Object.keys(room.players).length === 0) rooms.delete(room.code);
    }
  });
});

server.listen(PORT, async () => {
  try {
    await seedBadges();
  } catch (e) {
    console.warn("[badges] seed failed", e);
  }
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] allowed origin: ${CLIENT_ORIGIN}`);
});
