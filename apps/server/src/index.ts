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

type Player = {
  id: string;
  name: string;
  socketId: string;
  ready: boolean;
  correct: number;
};

type Room = {
  code: string;
  players: Record<string, Player>;
  started: boolean;
  totalQuestions: number;
  startAt?: number;
};

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);
const rooms = new Map<string, Room>();

function randomAnonName() {
  const a = ["용감한", "똑똑한", "빠른", "상냥한", "멋진", "집중하는"]; 
  const b = ["고양이", "토끼", "호랑이", "여우", "펭귄", "돌고래"]; 
  return `${a[Math.floor(Math.random() * a.length)]} ${b[Math.floor(Math.random() * b.length)]}`;
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
  }));
  return {
    code: room.code,
    players,
    started: room.started,
    totalQuestions: room.totalQuestions,
    startAt: room.startAt ?? null,
  };
}

io.on("connection", (socket) => {
  const playerId = socket.id;
  const name = randomAnonName();

  socket.on("room:create", ({ totalQuestions }: { totalQuestions?: number } = {}) => {
    const room = getOrCreateRoom();
    room.totalQuestions = totalQuestions ?? room.totalQuestions;

    room.players[playerId] = {
      id: playerId,
      name,
      socketId: socket.id,
      ready: false,
      correct: 0,
    };

    socket.join(room.code);
    io.to(room.code).emit("room:state", roomState(room));
  });

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
      room.startAt = Date.now() + 3000;
      io.to(room.code).emit("game:countdown", { startAt: room.startAt });
      io.to(room.code).emit("room:state", roomState(room));
    } else {
      io.to(room.code).emit("room:state", roomState(room));
    }
  });

  socket.on("game:answer", ({ code, correct }: { code: string; correct: boolean }) => {
    const room = rooms.get(code);
    if (!room || !room.started) return;
    const p = room.players[playerId];
    if (!p) return;
    if (correct) p.correct += 1;

    io.to(room.code).emit("room:state", roomState(room));

    // very simple win condition for MVP demo
    if (p.correct >= room.totalQuestions) {
      io.to(room.code).emit("game:finish", {
        winnerId: p.id,
        reason: "completed",
      });
      room.started = false;
      room.startAt = undefined;
      for (const pl of Object.values(room.players)) {
        pl.ready = false;
        pl.correct = 0;
      }
      io.to(room.code).emit("room:state", roomState(room));
    }
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
