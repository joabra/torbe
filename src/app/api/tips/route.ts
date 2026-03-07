import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  category: z.enum(["RESTAURANT", "EXCURSION", "MARKET", "EVENT", "OTHER"]),
  title: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
  address: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  mapUrl: z.string().url().optional().or(z.literal("")),
  openMonths: z.array(z.number().int().min(1).max(12)).optional(),
  seasonNote: z.string().max(200).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user ? (session.user as { id: string }).id : null;

    const tips = await prisma.tip.findMany({ orderBy: { createdAt: "desc" } });

    const countMap: Record<string, number> = {};
    let votedSet = new Set<string>();

    try {
      const allVotes = await prisma.tipVote.findMany({ select: { tipId: true, userId: true } });
      for (const v of allVotes) {
        countMap[v.tipId] = (countMap[v.tipId] ?? 0) + 1;
      }
      if (userId) {
        const userVotes = allVotes.filter((v) => v.userId === userId);
        votedSet = new Set(userVotes.map((v) => v.tipId));
      }
    } catch {
      // Votes table may not exist yet — return tips without vote info
    }

    return NextResponse.json(
      tips.map((t) => ({
        ...t,
        voteCount: countMap[t.id] ?? 0,
        userVoted: votedSet.has(t.id),
      }))
    );
  } catch (err) {
    console.error("[tips GET]", err);
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });

  const tip = await prisma.tip.create({
    data: { ...parsed.data, createdById: session.user.id },
  });
  return NextResponse.json(tip, { status: 201 });
}
