import { prisma } from "./db.js";

export type BadgeSeed = {
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const DEFAULT_BADGES: BadgeSeed[] = [
  {
    code: "FIRST_WIN",
    name: "첫 승리",
    description: "첫 번째 승리를 달성했어요!",
    icon: "🏆",
    rarity: "common",
  },
  {
    code: "FAST_FINISH",
    name: "스피드 러너",
    description: "빠르게 모든 문제를 풀었어요!",
    icon: "⚡",
    rarity: "rare",
  },
  {
    code: "PERFECT_GAME",
    name: "퍼펙트",
    description: "한 게임에서 모두 정답을 맞혔어요!",
    icon: "✨",
    rarity: "epic",
  },
  {
    code: "STREAK_3",
    name: "3연승",
    description: "3연승을 달성했어요!",
    icon: "🔥",
    rarity: "rare",
  },
];

export async function seedBadges() {
  for (const b of DEFAULT_BADGES) {
    await prisma.badge.upsert({
      where: { code: b.code },
      create: {
        code: b.code,
        name: b.name,
        description: b.description,
        icon: b.icon,
        rarity: b.rarity,
      },
      update: {
        name: b.name,
        description: b.description,
        icon: b.icon,
        rarity: b.rarity,
      },
    });
  }
}

export async function grantBadge(userId: string, badgeCode: string) {
  const badge = await prisma.badge.findUnique({ where: { code: badgeCode } });
  if (!badge) return null;

  return prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    create: { userId, badgeId: badge.id },
    update: {},
  });
}

export async function listMyBadges(userId: string) {
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { badge: true },
  });

  return rows.map((r) => ({
    code: r.badge.code,
    name: r.badge.name,
    description: r.badge.description,
    icon: r.badge.icon,
    rarity: r.badge.rarity,
    earnedAt: r.createdAt,
  }));
}
