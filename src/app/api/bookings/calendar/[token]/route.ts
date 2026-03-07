import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public iCal feed for a user's bookings — accessed via token (no auth cookie needed)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 32) {
    return new NextResponse("Ogiltig token", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, name: true },
  });

  if (!user) {
    return new NextResponse("Hittades inte", { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id, status: "APPROVED" },
    orderBy: { checkIn: "asc" },
  });

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const events = bookings
    .map((b) => {
      const checkIn = fmt(b.checkIn).slice(0, 8);
      const checkOut = fmt(b.checkOut).slice(0, 8);
      const now = fmt(new Date());
      return [
        "BEGIN:VEVENT",
        `UID:torbe-booking-${b.id}@torbe.se`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${checkIn}`,
        `DTEND;VALUE=DATE:${checkOut}`,
        `SUMMARY:Torbe — ${user.name}`,
        `DESCRIPTION:Antal gäster: ${b.guests}.${b.adminNote ? " " + b.adminNote : ""}`,
        "LOCATION:Mil Palmeras\\, Pilar de la Horadada\\, Alicante\\, Spanien",
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Torbe//Torbe Booking Feed//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Torbe – ${user.name}`,
    "X-WR-TIMEZONE:Europe/Stockholm",
    events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="torbe-kalender.ics"`,
      // Allow caching for 1 hour
      "Cache-Control": "max-age=3600",
    },
  });
}
