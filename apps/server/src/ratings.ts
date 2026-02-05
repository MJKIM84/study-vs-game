import { prisma } from "./db.js";

export function modeKey(opts: {
  grade: number;
  subject: string;
  semester: string;
  totalQuestions: number;
}) {
  // Keep it stable and queryable
  return `${opts.subject}:g${opts.grade}:sem${opts.semester}:q${opts.totalQuestions}`;
}

export async function recordMatchAndUpdateRatings(opts: {
  createdByUserId?: string | null;
  grade: number;
  subject: string;
  semester: string;
  totalQuestions: number;
  seed?: number | null;
  reason: string;
  winnerUserId?: string | null;
  players: Array<{
    socketId: string;
    userId?: string | null;
    username?: string | null;
    nickname?: string | null;
    correct: number;
    lastSubmitAt?: number | null;
    finishedAt?: number | null;
  }>;
}) {
  const mk = modeKey({
    grade: opts.grade,
    subject: opts.subject,
    semester: opts.semester,
    totalQuestions: opts.totalQuestions,
  });

  const winner = opts.winnerUserId ?? null;

  return prisma.$transaction(async (tx) => {
    const match = await tx.match.create({
      data: {
        createdByUserId: opts.createdByUserId ?? null,
        modeKey: mk,
        grade: opts.grade,
        subject: opts.subject,
        semester: opts.semester,
        totalQuestions: opts.totalQuestions,
        seed: opts.seed ?? null,
        reason: opts.reason,
        winnerUserId: winner,
        players: opts.players as any,
      },
    });

    // Update ratings only for authenticated users.
    for (const p of opts.players) {
      if (!p.userId) continue;

      const isWinner = winner && p.userId === winner;
      const isLoser = winner && p.userId !== winner;

      await tx.rating.upsert({
        where: { userId_modeKey: { userId: p.userId, modeKey: mk } },
        create: {
          userId: p.userId,
          modeKey: mk,
          gamesPlayed: 1,
          wins: isWinner ? 1 : 0,
          losses: isLoser ? 1 : 0,
        },
        update: {
          gamesPlayed: { increment: 1 },
          wins: isWinner ? { increment: 1 } : undefined,
          losses: isLoser ? { increment: 1 } : undefined,
        },
      });
    }

    return match;
  });
}

export async function leaderboard(opts: { modeKey: string; limit?: number }) {
  const rows = await prisma.rating.findMany({
    where: { modeKey: opts.modeKey },
    orderBy: [{ wins: "desc" }, { gamesPlayed: "asc" }],
    take: opts.limit ?? 20,
    include: { user: { select: { id: true, username: true, nickname: true } } },
  });
  return rows.map((r) => ({
    user: r.user,
    wins: r.wins,
    losses: r.losses,
    gamesPlayed: r.gamesPlayed,
  }));
}
