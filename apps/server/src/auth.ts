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

export function signToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, username: user.username, nickname: user.nickname },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = String(payload.sub);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, nickname: true },
    });
    return user ?? null;
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
