import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(bookings);
}

const createSchema = z.object({
  guestName: z.string().min(1).max(120),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().min(1).max(20),
  message: z.string().max(500).optional(),
  adminNote: z.string().max(500).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("APPROVED"),
});

/** POST /api/admin/bookings — admin skapar bokning direkt */
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  }

  const { guestName, checkIn, checkOut, guests, message, adminNote, status } = parsed.data;
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkInDate >= checkOutDate) {
    return NextResponse.json({ error: "Utcheckning måste vara efter incheckning" }, { status: 400 });
  }

  // Kontrollera överlapp med godkända bokningar om denna ska vara godkänd
  if (status === "APPROVED") {
    const overlap = await prisma.booking.findFirst({
      where: {
        status: "APPROVED",
        AND: [{ checkIn: { lt: checkOutDate } }, { checkOut: { gt: checkInDate } }],
      },
    });
    if (overlap) {
      return NextResponse.json({ error: "Datum krockar med en befintlig bokning" }, { status: 409 });
    }
  }

  const booking = await prisma.booking.create({
    data: { guestName, checkIn: checkInDate, checkOut: checkOutDate, guests, message, adminNote, status },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(booking, { status: 201 });
}
