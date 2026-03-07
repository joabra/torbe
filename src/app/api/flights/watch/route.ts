import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  origin: z.string().trim().length(3),
  destination: z.string().trim().length(3),
  direction: z.enum(["OUTBOUND", "RETURN"]),
  maxPrice: z.number().int().min(100).max(10000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const watches = await prisma.flightWatch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(watches);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const watch = await prisma.flightWatch.create({
    data: {
      userId,
      origin: parsed.data.origin.toUpperCase(),
      destination: parsed.data.destination.toUpperCase(),
      direction: parsed.data.direction,
      maxPrice: parsed.data.maxPrice,
    },
  });

  return NextResponse.json(watch, { status: 201 });
}
