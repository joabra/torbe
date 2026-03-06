import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");

  const rows = [
    ["ID", "Status", "Gäst", "E-post", "Gästnamn", "Incheckning", "Utcheckning", "Antal gäster", "Meddelande", "Admin-anteckning", "Skapad"],
    ...bookings.map((b) => [
      b.id,
      b.status,
      b.user?.name ?? "",
      b.user?.email ?? "",
      b.guestName ?? "",
      fmt(b.checkIn),
      fmt(b.checkOut),
      String(b.guests),
      b.message ?? "",
      b.adminNote ?? "",
      fmt(b.createdAt),
    ]),
  ];

  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="torbe-bokningar-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
