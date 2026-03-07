import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;

  const entries = await prisma.guestbookEntry.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true } },
      likes: { select: { userId: true } },
    },
  });

  return NextResponse.json(
    entries.map((e) => ({
      ...e,
      likeCount: e.likes.length,
      userLiked: userId ? e.likes.some((l) => l.userId === userId) : false,
      likes: undefined,
    }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const content = (body.content ?? "").trim();
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: "Ogiltigt innehåll" }, { status: 400 });
  }

  const visitYear = body.visitYear ? Number(body.visitYear) : null;
  if (visitYear !== null && (isNaN(visitYear) || visitYear < 1900 || visitYear > 2100)) {
    return NextResponse.json({ error: "Ogiltigt år" }, { status: 400 });
  }

  const entry = await prisma.guestbookEntry.create({
    data: {
      authorId: (session.user as { id: string }).id,
      content,
      visitYear,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
