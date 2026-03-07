import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

// GET - get (or create) the user's calendar token and return the feed URL
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  let user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarToken: true } });

  if (!user?.calendarToken) {
    const token = randomBytes(32).toString("hex");
    user = await prisma.user.update({
      where: { id: userId },
      data: { calendarToken: token },
      select: { calendarToken: true },
    });
  }

  const base = process.env.NEXTAUTH_URL ?? "https://torbe.vercel.app";
  return NextResponse.json({ token: user!.calendarToken, url: `${base}/api/bookings/calendar/${user!.calendarToken}` });
}

// DELETE - revoke calendar token
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  await prisma.user.update({ where: { id: userId }, data: { calendarToken: null } });
  return NextResponse.json({ ok: true });
}
