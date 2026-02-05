import { prisma } from "./db.js";
import { BADGE_KIT_V1 } from "./badgeKit.v1.js";

export async function seedBadges() {
  for (const b of BADGE_KIT_V1) {
    await prisma.badge.upsert({
      where: { code: b.code },
      create: {
        code: b.code,
        name: b.name,
        description: b.description,
        icon: b.svg,
        rarity: b.rarity,
      },
      update: {
        name: b.name,
        description: b.description,
        icon: b.svg,
        rarity: b.rarity,
      },
    });
  }
}

export async function grantBadge(userId: string, badgeCode: string) {
  const badge = await prisma.badge.findUnique({ where: { code: badgeCode } });
  if (!badge) return null;

  // Create once; if already exists, return null (no new award)
  try {
    const created = await prisma.userBadge.create({
      data: { userId, badgeId: badge.id },
      include: { badge: true },
    });
    return created;
  } catch {
    return null;
  }
}

export async function listBadges() {
  const rows = await prisma.badge.findMany({
    orderBy: [{ rarity: "asc" }, { code: "asc" }],
  });
  return rows.map((b) => ({
    code: b.code,
    name: b.name,
    description: b.description,
    icon: b.icon,
    rarity: b.rarity,
  }));
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
