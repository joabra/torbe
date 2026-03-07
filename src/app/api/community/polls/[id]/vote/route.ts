import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const schema = z.object({
  optionId: z.string().min(1),
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig röst" }, { status: 400 });
  }

  const poll = await prisma.poll.findUnique({
    where: { id },
    include: { options: { select: { id: true } } },
  });

  if (!poll) return NextResponse.json({ error: "Omröstning hittades inte" }, { status: 404 });
  if (poll.status !== "ACTIVE") return NextResponse.json({ error: "Omröstningen är stängd" }, { status: 400 });
  if (poll.closesAt && poll.closesAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Omröstningen är stängd" }, { status: 400 });
  }

  const validOption = poll.options.some((o) => o.id === parsed.data.optionId);
  if (!validOption) return NextResponse.json({ error: "Ogiltigt alternativ" }, { status: 400 });

  const userId = (session.user as { id: string }).id;

  await prisma.pollVote.upsert({
    where: {
      pollId_userId: {
        pollId: id,
        userId,
      },
    },
    create: {
      pollId: id,
      userId,
      optionId: parsed.data.optionId,
    },
    update: {
      optionId: parsed.data.optionId,
      createdAt: new Date(),
    },
  });

  const totals = await prisma.pollOption.findMany({
    where: { pollId: id },
    include: { _count: { select: { votes: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    options: totals.map((opt) => ({ id: opt.id, text: opt.text, votes: opt._count.votes })),
    myVoteOptionId: parsed.data.optionId,
  });
}
