import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string })?.role;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Bokning hittades inte" }, { status: 404 });
  }

  // Only the booking owner or admin may download
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const guestName = booking.user?.name ?? booking.guestName ?? "Gäst";
  const now = fmt(new Date());
  const checkIn = fmt(booking.checkIn);
  const checkOut = fmt(booking.checkOut);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Torbe//Torbe Booking//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:torbe-booking-${booking.id}@torbe.se`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${checkIn.slice(0, 8)}`,
    `DTEND;VALUE=DATE:${checkOut.slice(0, 8)}`,
    `SUMMARY:Torbe — ${guestName}`,
    `DESCRIPTION:Bokning för ${guestName}. Antal gäster: ${booking.guests}.`,
    "LOCATION:Mil Palmeras\\, Pilar de la Horadada\\, Alicante\\, Spanien",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="torbe-bokning-${id}.ics"`,
    },
  });
}
