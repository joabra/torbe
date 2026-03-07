import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { emailUsersNewPoll } from "@/lib/email";

const createPollSchema = z.object({
  question: z.string().trim().min(4).max(180),
  description: z.string().trim().max(300).optional(),
  closesAt: z.string().datetime().optional(),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(8),
});

export async function GET() {
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const polls = await prisma.poll.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 20,
    include: {
      createdBy: { select: { name: true } },
      options: {
        include: {
          _count: { select: { votes: true } },
        },
      },
      votes: userId ? { where: { userId }, select: { optionId: true }, take: 1 } : false,
      _count: { select: { votes: true } },
    },
  });

  return NextResponse.json(
    polls.map((poll) => {
      const myVoteOptionId = userId && Array.isArray(poll.votes) && poll.votes.length > 0 ? poll.votes[0].optionId : null;
      return {
        id: poll.id,
        question: poll.question,
        description: poll.description,
        status: poll.status,
        closesAt: poll.closesAt,
        createdAt: poll.createdAt,
        createdBy: poll.createdBy?.name ?? null,
        totalVotes: poll._count.votes,
        myVoteOptionId,
        options: poll.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          votes: opt._count.votes,
        })),
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga fält" }, { status: 400 });
  }

  const uniqueOptions = Array.from(new Set(parsed.data.options.map((o) => o.trim()).filter(Boolean)));
  if (uniqueOptions.length < 2) {
    return NextResponse.json({ error: "Ange minst två unika alternativ" }, { status: 400 });
  }

  const creatorId = (session.user as { id: string }).id;

  const poll = await prisma.poll.create({
    data: {
      question: parsed.data.question,
      description: parsed.data.description || null,
      closesAt: parsed.data.closesAt ? new Date(parsed.data.closesAt) : null,
      createdById: creatorId,
      options: {
        create: uniqueOptions.map((text) => ({ text })),
      },
    },
    include: {
      options: true,
      createdBy: { select: { name: true } },
    },
  });

  const recipients = await prisma.user.findMany({
    where: {
      approved: true,
      id: { not: creatorId },
    },
    select: { id: true, name: true, email: true },
  });

  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        type: "POLL_CREATED",
        title: "Ny omröstning i Gemenskap",
        body: parsed.data.question,
        linkUrl: "/community",
      })),
    });

    await emailUsersNewPoll(
      { question: parsed.data.question, options: uniqueOptions },
      recipients.map((user) => ({ name: user.name, email: user.email }))
    );
  }

  return NextResponse.json(poll, { status: 201 });
}
