import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./auth.js";

function bearerToken(req: Request) {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1] ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ ok: false, error: "missing_token" });
  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ ok: false, error: "invalid_token" });
  (req as any).user = user;
  next();
}

export function getReqUser(req: Request) {
  return (req as any).user as { id: string; username: string; nickname: string } | undefined;
}

const SignupBody = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(6).max(128),
  nickname: z.string().trim().min(1).max(32),
});

const LoginBody = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(6).max(128),
});

export async function postSignup(req: Request, res: Response) {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_request" });

  const { username, password, nickname } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return res.status(409).json({ ok: false, error: "username_taken" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, nickname, passwordHash },
    select: { id: true, username: true, nickname: true },
  });

  const token = signToken(user);
  res.json({ ok: true, user, token });
}

export async function postLogin(req: Request, res: Response) {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_request" });

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, nickname: true, passwordHash: true },
  });
  if (!user) return res.status(401).json({ ok: false, error: "invalid_credentials" });

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) return res.status(401).json({ ok: false, error: "invalid_credentials" });

  const token = signToken({ id: user.id, username: user.username, nickname: user.nickname });
  res.json({ ok: true, user: { id: user.id, username: user.username, nickname: user.nickname }, token });
}

export async function getMe(req: Request, res: Response) {
  const token = bearerToken(req);
  if (!token) return res.status(200).json({ ok: true, user: null });
  const user = await verifyToken(token);
  res.json({ ok: true, user });
}
