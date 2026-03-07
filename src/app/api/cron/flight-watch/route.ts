import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailUserFlightWatchMatch } from "@/lib/email";
import { logCronError, logCronSuccess } from "@/lib/cron-log";

interface TpFlight {
  departure_at: string;
  price: number;
  airline: string;
  transfers: number;
  origin: string;
  destination: string;
}

async function fetchBestDirectPrice(origin: string, destination: string, year: number, month: number) {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const departDate = `${year}-${pad(month)}`;

  const url =
    `https://api.travelpayouts.com/aviasales/v3/prices_for_dates` +
    `?origin=${origin}&destination=${destination}` +
    `&period_type=month&one_way=true&currency=sek` +
    `&depart_date=${departDate}&token=${token}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const data = (await res.json()) as { success: boolean; data: TpFlight[] };
  if (!data.success || !Array.isArray(data.data) || data.data.length === 0) return null;

  const direct = data.data
    .filter((f) => f.transfers === 0)
    .filter((f) => {
      const d = new Date(f.departure_at);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .sort((a, b) => a.price - b.price);

  if (direct.length === 0) return null;

  const cheapest = direct[0];
  return {
    date: cheapest.departure_at.split("T")[0],
    price: Math.round(cheapest.price),
    airline: cheapest.airline,
  };
}

export async function GET(req: NextRequest) {
  const startedAt = new Date();
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = req.headers.get("x-cron-source") === "manual" ? "MANUAL" : "SCHEDULED";

  try {

  const watches = await prisma.flightWatch.findMany({
    where: { active: true },
    include: { user: { select: { name: true, email: true } } },
  });

  const now = new Date();
  const monthTargets = [
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { year: new Date(now.getFullYear(), now.getMonth() + 1, 1).getFullYear(), month: new Date(now.getFullYear(), now.getMonth() + 1, 1).getMonth() + 1 },
  ];

  let notified = 0;

  for (const watch of watches) {
    const last = watch.lastNotifiedAt ? new Date(watch.lastNotifiedAt) : null;
    if (last && now.getTime() - last.getTime() < 24 * 60 * 60 * 1000) continue;

    let match: { date: string; price: number; airline: string } | null = null;
    for (const target of monthTargets) {
      const candidate = await fetchBestDirectPrice(watch.origin, watch.destination, target.year, target.month);
      if (!candidate) continue;
      if (candidate.price <= watch.maxPrice) {
        match = candidate;
        break;
      }
    }

    if (!match) continue;

    await emailUserFlightWatchMatch(
      {
        origin: watch.origin,
        destination: watch.destination,
        maxPrice: watch.maxPrice,
        foundPrice: match.price,
        date: match.date,
        direction: watch.direction,
      },
      {
        name: watch.user.name,
        email: watch.user.email,
      }
    );

    await prisma.flightWatch.update({
      where: { id: watch.id },
      data: { lastNotifiedAt: now },
    });

    notified++;
  }

    const result = { ok: true, watchesChecked: watches.length, notificationsSent: notified };
    await logCronSuccess("FLIGHT_WATCH", source, startedAt, result);
    return NextResponse.json(result);
  } catch (error) {
    await logCronError("FLIGHT_WATCH", source, startedAt, error);
    return NextResponse.json({ error: "Flight-watch jobb misslyckades" }, { status: 500 });
  }
}
