import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const prismaWithWaitlist = prisma as typeof prisma & {
  waitlist: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown | null>;
    create: (args: unknown) => Promise<unknown>;
  };
};

const schema = z.object({
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().min(1).max(20).default(1),
  message: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const entries = await prismaWithWaitlist.waitlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

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
    return NextResponse.json({ error: "Kan inte bevaka datum i det förflutna" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;

  const existing = await prismaWithWaitlist.waitlist.findFirst({
    where: {
      userId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      notified: false,
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Du bevakar redan dessa datum" }, { status: 409 });
  }

  const entry = await prismaWithWaitlist.waitlist.create({
    data: {
      userId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      message,
      notified: false,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
