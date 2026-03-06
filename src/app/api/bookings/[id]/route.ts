import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { emailUserBookingStatus } from "@/lib/email";

export const maxDuration = 30;
import { z } from "zod";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });

    const { status, adminNote } = parsed.data;

    // If approving, check for overlaps with other approved bookings
    if (status === "APPROVED") {
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return NextResponse.json({ error: "Bokning hittades inte" }, { status: 404 });

      const overlap = await prisma.booking.findFirst({
        where: {
          id: { not: id },
          status: "APPROVED",
          AND: [
            { checkIn: { lt: booking.checkOut } },
            { checkOut: { gt: booking.checkIn } },
          ],
        },
      });

      if (overlap) {
        return NextResponse.json({ error: "Datum krockar med en befintlig bokning" }, { status: 409 });
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status, adminNote },
      include: { user: { select: { name: true, email: true } } },
    });

    // Notifiera användaren om statusbytet
    if (updated.user) {
      await emailUserBookingStatus(
        { status, checkIn: updated.checkIn, checkOut: updated.checkOut, adminNote: updated.adminNote },
        { name: updated.user.name, email: updated.user.email }
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.booking.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
