// Hämtar billiga direktflyg till Alicante via Travelpayouts API (aggregerar Ryanair, Norwegian, SAS m.fl.)
// Kompletteras med Ryanairs egna priskalender för per-datum-täckning.
// Returnerar billigaste pris per datum och riktning.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 20;

interface FlightDeal {
  date: string;
  price: number;
  currency: string;
  airline: string;
  transfers: number;
  deepLink: string;
  direction: "outbound" | "return";
}

/* ── Cache per månad (2 timmar TTL) ─────────────────────────────── */

const flightCache = new Map<string, { data: FlightDeal[]; expires: number }>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

/* ── Travelpayouts / Aviasales API ───────────────────────────────── */

interface TpFlight {
  departure_at: string;
  price: number;
  airline: string;
  transfers: number;
  link: string;
  origin: string;
  destination: string;
}

async function fetchTravelpayoutsFares(
  origin: string,
  destination: string,
  year: number,
  month: number,
): Promise<{ date: string; price: number; airline: string; transfers: number; deepLink: string; origin: string; destination: string }[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const departDate = `${year}-${pad(month)}`;

  const url =
    `https://api.travelpayouts.com/aviasales/v3/prices_for_dates` +
    `?origin=${origin}&destination=${destination}` +
    `&period_type=month&one_way=true&currency=sek` +
    `&depart_date=${departDate}&token=${token}`;

  try {
    const res = await fetch(url, { next: { revalidate: 7200 } });
    if (!res.ok) {
      console.warn(`[flights] Travelpayouts ${res.status} for ${origin}→${destination}`);
      return [];
    }
    const data = await res.json() as { success: boolean; data: TpFlight[] };
    if (!data.success) return [];

    return data.data
      .filter((f) => f.transfers === 0) // bara direktflyg
      .filter((f) => {
        const d = new Date(f.departure_at);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      .map((f) => ({
        date: f.departure_at.split("T")[0],
        price: Math.round(f.price),
        airline: f.airline,
        transfers: f.transfers,
        deepLink: `https://www.aviasales.com${f.link}`,
        origin: f.origin,
        destination: f.destination,
      }));
  } catch (err) {
    console.warn(`[flights] Travelpayouts fetch error ${origin}→${destination}:`, err);
    return [];
  }
}

/* ── Ryanair priskalender-API (per-datum komplettering) ──────────── */

interface RyanairDayFare {
  day: string;
  departureDate: string | null;
  price: { value: number; currencyCode: string } | null;
  soldOut: boolean;
  unavailable: boolean;
}

async function fetchRyanairFares(
  origin: string,
  destination: string,
  year: number,
  month: number,
): Promise<{ date: string; price: number; airline: string; transfers: number; deepLink: string; origin: string; destination: string }[]> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthDate = `${year}-${pad(month)}-01`;

  const url =
    `https://services-api.ryanair.com/farfnd/3/oneWayFares/${origin}/${destination}/cheapestPerDay` +
    `?outboundMonthOfDate=${monthDate}&currency=SEK`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 7200 },
    });
    if (!res.ok) {
      console.warn(`[flights] Ryanair ${res.status} for ${origin}→${destination}`);
      return [];
    }
    const data = await res.json();
    const fares: RyanairDayFare[] = data?.outbound?.fares ?? [];
    return fares
      .filter((f) => !f.unavailable && !f.soldOut && f.price !== null && f.departureDate !== null)
      .map((f) => ({
        date: f.day,
        price: Math.round(f.price!.value),
        airline: "FR",
        transfers: 0,
        deepLink:
          `https://www.ryanair.com/se/sv/trip/flights/select` +
          `?adults=1&teens=0&children=0&infants=0` +
          `&dateOut=${f.day}` +
          `&originIata=${origin}&destinationIata=${destination}&isConnectedFlight=false&isReturn=false`,
        origin,
        destination,
      }));
  } catch (err) {
    console.warn(`[flights] Ryanair fetch error ${origin}→${destination}:`, err);
    return [];
  }
}

/* ── GET-handler ─────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "");
  const month = parseInt(searchParams.get("month") ?? "");

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Ogiltiga parametrar" }, { status: 400 });
  }

  const cacheKey = `${year}-${month}`;
  const cached = flightCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) return NextResponse.json(cached.data);

  // Sök parallellt: GOT + VXO → ALC (utresa) samt ALC → GOT + VXO (hemresa)
  // Travelpayouts aggregerar Ryanair, Norwegian, SAS m.fl.
  // Ryanair kompletterar med per-datum-täckning
  const ALC = "ALC";
  const sweAirports = ["GOT", "VXO"];
  const routes: [string, string][] = [
    ...sweAirports.map((a): [string, string] => [a, ALC]),
    ...sweAirports.map((a): [string, string] => [ALC, a]),
  ];

  const [tpResults, ryResults] = await Promise.all([
    Promise.all(routes.map(([o, d]) => fetchTravelpayoutsFares(o, d, year, month))),
    Promise.all(routes.map(([o, d]) => fetchRyanairFares(o, d, year, month))),
  ]);

  const allRaw = [...tpResults.flat(), ...ryResults.flat()];

  // Välj billigaste per datum och riktning
  const cheapestOutbound = new Map<string, FlightDeal>();
  const cheapestReturn = new Map<string, FlightDeal>();

  for (const r of allRaw) {
    const isReturn = r.origin === ALC;
    const map = isReturn ? cheapestReturn : cheapestOutbound;
    const existing = map.get(r.date);
    if (!existing || r.price < existing.price) {
      map.set(r.date, {
        date: r.date,
        price: r.price,
        currency: "SEK",
        airline: r.airline,
        transfers: r.transfers,
        deepLink: r.deepLink,
        direction: isReturn ? "return" : "outbound",
      });
    }
  }

  const deals = [
    ...Array.from(cheapestOutbound.values()),
    ...Array.from(cheapestReturn.values()),
  ];

  console.log(`[flights] ${deals.length} priser för ${year}-${String(month).padStart(2, "0")} (TP + Ryanair)`);

  flightCache.set(cacheKey, { data: deals, expires: Date.now() + CACHE_TTL_MS });
  return NextResponse.json(deals);
}

