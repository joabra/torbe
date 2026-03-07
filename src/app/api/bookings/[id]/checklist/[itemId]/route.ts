import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  completed: z.boolean().optional(),
  content: z.string().trim().min(1).max(200).optional(),
});

async function canAccessItem(bookingId: string, itemId: string) {
  const session = await auth();
  if (!session?.user) return { allowed: false as const };

  const item = await prisma.bookingChecklistItem.findUnique({ where: { id: itemId } });
  if (!item || item.bookingId !== bookingId) return { allowed: false as const, item: null };

  const role = (session.user as { role?: string }).role;
  if (role === "ADMIN") return { allowed: true as const, item };

  const userId = (session.user as { id: string }).id;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true } });
  return { allowed: booking?.userId === userId, item };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: bookingId, itemId } = await params;
  const access = await canAccessItem(bookingId, itemId);
  if (!access.allowed) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || (parsed.data.completed === undefined && parsed.data.content === undefined)) {
    return NextResponse.json({ error: "Ogiltig uppdatering" }, { status: 400 });
  }

  const item = await prisma.bookingChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(parsed.data.completed !== undefined ? { completed: parsed.data.completed } : {}),
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: bookingId, itemId } = await params;
  const access = await canAccessItem(bookingId, itemId);
  if (!access.allowed) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  await prisma.bookingChecklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
