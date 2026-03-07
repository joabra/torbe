import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  content: z.string().trim().min(1).max(200),
});

async function canAccessBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user) return { allowed: false as const };

  const role = (session.user as { role?: string }).role;
  if (role === "ADMIN") return { allowed: true as const, session };

  const userId = (session.user as { id: string }).id;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true } });
  return { allowed: booking?.userId === userId, session };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const access = await canAccessBooking(bookingId);
  if (!access.allowed) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const items = await prisma.bookingChecklistItem.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const access = await canAccessBooking(bookingId);
  if (!access.allowed) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig checklistepunkt" }, { status: 400 });
  }

  const item = await prisma.bookingChecklistItem.create({
    data: {
      bookingId,
      content: parsed.data.content,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
