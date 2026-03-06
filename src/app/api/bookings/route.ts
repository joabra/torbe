import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { emailAdminNewBooking } from "@/lib/email";

export const maxDuration = 30;
import { z } from "zod";

const schema = z.object({
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().min(1).max(20),
  message: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  const authed = !!session?.user;

  if (authed) {
    // Inloggad: returnera både godkända och väntande bokningar
    const bookings = await prisma.booking.findMany({
      where: { status: { in: ["APPROVED", "PENDING"] } },
      select: { checkIn: true, checkOut: true, id: true, guestName: true, status: true, user: { select: { name: true } } },
    });
    return NextResponse.json(bookings);
  }

  // Ej inloggad: bara godkända
  const bookings = await prisma.booking.findMany({
    where: { status: "APPROVED" },
    select: { checkIn: true, checkOut: true, id: true, guestName: true, user: { select: { name: true } } },
  });
  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
    }

    const { checkIn, checkOut, guests, message } = parsed.data;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      return NextResponse.json({ error: "Utcheckning måste vara efter incheckning" }, { status: 400 });
    }

    if (checkInDate < new Date()) {
      return NextResponse.json({ error: "Kan inte boka i det förflutna" }, { status: 400 });
    }

    // Check for overlapping approved bookings
    const overlap = await prisma.booking.findFirst({
      where: {
        status: "APPROVED",
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
    });

    if (overlap) {
      return NextResponse.json({ error: "Dessa datum är redan bokade" }, { status: 409 });
    }

    const userId = (session.user as { id: string }).id;
    const booking = await prisma.booking.create({
      data: { userId, checkIn: checkInDate, checkOut: checkOutDate, guests, message, status: "PENDING" },
    });

    // Notifiera admin
    const userObj = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    if (userObj) {
      await emailAdminNewBooking(
        { checkIn: checkInDate, checkOut: checkOutDate, guests, message },
        userObj
      );
    }

    return NextResponse.json(booking, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}
