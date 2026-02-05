import type { Request, Response } from "express";
import { prisma } from "./db.js";
import { getReqUser } from "./httpAuthRoutes.js";

export async function getMeStats(req: Request, res: Response) {
  const user = getReqUser(req);
  if (!user) return res.status(401).json({ ok: false, error: "unauthorized" });

  const modeKey = req.query.modeKey ? String(req.query.modeKey) : null;

  const ratings = await prisma.rating.findMany({
    where: {
      userId: user.id,
      ...(modeKey ? { modeKey } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const totals = ratings.reduce(
    (acc, r) => {
      acc.gamesPlayed += r.gamesPlayed;
      acc.wins += r.wins;
      acc.losses += r.losses;
      return acc;
    },
    { gamesPlayed: 0, wins: 0, losses: 0 },
  );

  res.json({ ok: true, user, modeKey, totals, ratings });
}
