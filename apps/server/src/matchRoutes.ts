import type { Request, Response } from "express";
import { prisma } from "./db.js";
import { getReqUser } from "./httpAuthRoutes.js";

export async function getMyMatches(req: Request, res: Response) {
  const user = getReqUser(req);
  if (!user) return res.status(401).json({ ok: false, error: "unauthorized" });

  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));

  const rows = await prisma.match.findMany({
    where: {
      OR: [
        { createdByUserId: user.id },
        // players JSON contains userId is not easily queryable in sqlite; keep createdBy for now.
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({ ok: true, rows });
}
