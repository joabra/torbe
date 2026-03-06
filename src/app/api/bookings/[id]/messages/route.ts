import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const role = (session.user as { role?: string })?.role;
  const userId = (session.user as { id: string }).id;

  // Only admin or booking owner may read messages
  if (role !== "ADMIN") {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true } });
    if (!booking || booking.userId !== userId) {
      return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
    }
  }

  const messages = await prisma.bookingMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const role = (session.user as { role?: string })?.role;
  const userId = (session.user as { id: string }).id;

  // Only admin or booking owner may post messages
  if (role !== "ADMIN") {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true } });
    if (!booking || booking.userId !== userId) {
      return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltigt meddelande" }, { status: 400 });
  }

  const message = await prisma.bookingMessage.create({
    data: {
      bookingId,
      authorId: userId,
      content: parsed.data.content,
      isAdmin: role === "ADMIN",
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}
