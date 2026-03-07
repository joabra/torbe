import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthlyTipVotes, topContributors] = await Promise.all([
    prisma.tipVote.groupBy({
      by: ["tipId"],
      where: { createdAt: { gte: monthStart } },
      _count: { tipId: true },
      orderBy: { _count: { tipId: "desc" } },
      take: 5,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { tips: { some: { createdAt: { gte: monthStart } } } },
          { visitPhotos: { some: { createdAt: { gte: monthStart } } } },
          { guestbookEntries: { some: { createdAt: { gte: monthStart } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        tips: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
        visitPhotos: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
        guestbookEntries: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
      },
    }),
  ]);

  const tipIds = monthlyTipVotes.map((v) => v.tipId);
  const topTipsWithMeta = tipIds.length
    ? await prisma.tip.findMany({
        where: { id: { in: tipIds } },
        include: { createdBy: { select: { name: true } } },
      })
    : [];

  const tipMap = new Map(topTipsWithMeta.map((t) => [t.id, t]));
  const topTips = monthlyTipVotes
    .map((voteRow) => {
      const tip = tipMap.get(voteRow.tipId);
      if (!tip) return null;
      return {
        id: tip.id,
        title: tip.title,
        category: tip.category,
        votesThisMonth: voteRow._count.tipId,
        createdBy: tip.createdBy?.name ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const rankedContributors = topContributors
    .map((u) => {
      const tips = u.tips.length;
      const photos = u.visitPhotos.length;
      const guestbook = u.guestbookEntries.length;
      const total = tips + photos + guestbook;
      return {
        id: u.id,
        name: u.name,
        tips,
        photos,
        guestbook,
        total,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return NextResponse.json({
    month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
    topTips,
    topContributors: rankedContributors,
  });
}
