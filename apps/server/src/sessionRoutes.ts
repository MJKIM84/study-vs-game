import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { getReqUser } from "./httpAuthRoutes.js";

export async function getMySessions(req: Request, res: Response) {
  const u = getReqUser(req);
  if (!u?.id) return res.status(401).json({ ok: false, error: "unauthorized" });

  const sessions = await prisma.session.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json({
    ok: true,
    currentSessionId: u.sessionId ?? null,
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      revokedAt: s.revokedAt,
      ip: s.ip,
      userAgent: s.userAgent,
    })),
  });
}

const RevokeBody = z.object({ sessionId: z.string().min(1) });

export async function postRevokeSession(req: Request, res: Response) {
  const u = getReqUser(req);
  if (!u?.id) return res.status(401).json({ ok: false, error: "unauthorized" });

  const parsed = RevokeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_request" });

  const { sessionId } = parsed.data;

  // cannot revoke a session that isn't yours
  const s = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!s || s.userId !== u.id) return res.status(404).json({ ok: false, error: "not_found" });

  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  res.json({ ok: true });
}

export async function postLogout(req: Request, res: Response) {
  const u = getReqUser(req);
  if (!u?.id) return res.status(401).json({ ok: false, error: "unauthorized" });
  if (u.sessionId) {
    await prisma.session.update({ where: { id: u.sessionId }, data: { revokedAt: new Date() } }).catch(() => {});
  }
  res.json({ ok: true });
}

const ProfileBody = z.object({ nickname: z.string().trim().min(1).max(32) });

export async function postUpdateProfile(req: Request, res: Response) {
  const u = getReqUser(req);
  if (!u?.id) return res.status(401).json({ ok: false, error: "unauthorized" });

  const parsed = ProfileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_request" });

  const user = await prisma.user.update({
    where: { id: u.id },
    data: { nickname: parsed.data.nickname },
    select: { id: true, username: true, nickname: true },
  });

  res.json({ ok: true, user });
}

const PasswordBody = z.object({ currentPassword: z.string().min(6).max(128), newPassword: z.string().min(6).max(128) });

export async function postChangePassword(req: Request, res: Response) {
  const u = getReqUser(req);
  if (!u?.id) return res.status(401).json({ ok: false, error: "unauthorized" });

  const parsed = PasswordBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "bad_request" });

  const user = await prisma.user.findUnique({ where: { id: u.id }, select: { id: true, passwordHash: true } });
  if (!user) return res.status(404).json({ ok: false, error: "not_found" });

  const { verifyPassword, hashPassword } = await import("./auth.js");
  const ok = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!ok) return res.status(401).json({ ok: false, error: "invalid_credentials" });

  const newHash = await hashPassword(parsed.data.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: u.id }, data: { passwordHash: newHash } });
    // revoke all sessions
    await tx.session.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
  });

  res.json({ ok: true });
}
