import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { prisma } from "./db.js";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";
if (!JWT_SECRET) {
  // Fail fast in dev so we don't accidentally issue unsigned tokens
  throw new Error("Missing JWT_SECRET env var");
}

export type AuthUser = {
  id: string;
  username: string;
  nickname: string;
};

export function signToken(user: AuthUser, opts?: { sessionId?: string }) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      nickname: user.nickname,
      sid: opts?.sessionId ?? null,
    },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

export async function verifyToken(token: string): Promise<(AuthUser & { sessionId: string | null }) | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = String(payload.sub);
    const sessionId = payload.sid ? String(payload.sid) : null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, nickname: true },
    });
    if (!user) return null;

    // If token includes a session id, validate it's not revoked.
    if (sessionId) {
      const s = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!s || s.userId !== userId) return null;
      if (s.revokedAt) return null;

      // best-effort last seen update (don’t block auth)
      prisma.session
        .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    }

    return { ...user, sessionId };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
