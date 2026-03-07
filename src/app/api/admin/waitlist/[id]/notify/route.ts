import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailUserWaitlistMatch } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id } = await params;
  const entry = await prisma.waitlist.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!entry) {
    return NextResponse.json({ error: "Väntelistepost hittades inte" }, { status: 404 });
  }

  await emailUserWaitlistMatch(
    {
      checkIn: entry.checkIn,
      checkOut: entry.checkOut,
      guests: entry.guests,
      message: entry.message,
    },
    {
      name: entry.user.name,
      email: entry.user.email,
    }
  );

  const updated = await prisma.waitlist.update({
    where: { id: entry.id },
    data: { notified: true },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(updated);
}
