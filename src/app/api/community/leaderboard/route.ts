import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [yearlyTipVotes, topContributors] = await Promise.all([
    prisma.tipVote.groupBy({
      by: ["tipId"],
      where: { createdAt: { gte: yearStart } },
      _count: { tipId: true },
      orderBy: { _count: { tipId: "desc" } },
      take: 5,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { tips: { some: { createdAt: { gte: yearStart } } } },
          { visitPhotos: { some: { createdAt: { gte: yearStart } } } },
          { guestbookEntries: { some: { createdAt: { gte: yearStart } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        tips: { where: { createdAt: { gte: yearStart } }, select: { id: true } },
        visitPhotos: { where: { createdAt: { gte: yearStart } }, select: { id: true } },
        guestbookEntries: { where: { createdAt: { gte: yearStart } }, select: { id: true } },
      },
    }),
  ]);

  const tipIds = yearlyTipVotes.map((v) => v.tipId);
  const topTipsWithMeta = tipIds.length
    ? await prisma.tip.findMany({
        where: { id: { in: tipIds } },
        include: { createdBy: { select: { name: true } } },
      })
    : [];

  const tipMap = new Map(topTipsWithMeta.map((t) => [t.id, t]));
  const topTips = yearlyTipVotes
    .map((voteRow) => {
      const tip = tipMap.get(voteRow.tipId);
      if (!tip) return null;
      return {
        id: tip.id,
        title: tip.title,
        category: tip.category,
        votesThisYear: voteRow._count.tipId,
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
    year: now.getFullYear(),
    topTips,
    topContributors: rankedContributors,
  });
}
