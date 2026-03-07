import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const photoSchema = z.object({
  url: z.string().url(),
  caption: z.string().max(300).optional(),
  bookingId: z.string().optional(),
});

// GET - fetch all visit photos (public)
export async function GET() {
  const photos = await prisma.visitPhoto.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      booking: { select: { checkIn: true, checkOut: true } },
    },
  });
  return NextResponse.json(photos);
}

// POST - upload new visit photo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = photoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;

  // If bookingId provided, verify it belongs to this user
  if (parsed.data.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      select: { userId: true },
    });
    if (!booking || booking.userId !== userId) {
      return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
    }
  }

  const photo = await prisma.visitPhoto.create({
    data: {
      url: parsed.data.url,
      caption: parsed.data.caption,
      userId,
      bookingId: parsed.data.bookingId,
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(photo, { status: 201 });
}
