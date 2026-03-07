import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  proposedCheckIn: z.string().datetime(),
  proposedCheckOut: z.string().datetime(),
});

// GET - get date proposals for a booking
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string })?.role;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: "Hittades inte" }, { status: 404 });

  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const proposals = await prisma.dateProposal.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(proposals);
}

// POST - admin proposes alternative dates for a booking
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id: bookingId } = await params;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: "Bokning hittades inte" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  }

  const checkIn = new Date(parsed.data.proposedCheckIn);
  const checkOut = new Date(parsed.data.proposedCheckOut);

  if (checkIn >= checkOut) {
    return NextResponse.json({ error: "Utcheckning måste vara efter incheckning" }, { status: 400 });
  }

  const proposal = await prisma.dateProposal.create({
    data: {
      bookingId,
      proposedCheckIn: checkIn,
      proposedCheckOut: checkOut,
      status: "PENDING",
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
