import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const bookings = await prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}
