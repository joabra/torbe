// API-route för att hämta billiga direktflyg via Amadeus Flight Offers API.
// Skapa ett gratis utvecklarkonto på https://developers.amadeus.com och lägg
// till AMADEUS_API_KEY och AMADEUS_API_SECRET i din .env.local-fil.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 60; // sekunder – tillåt längre körtid för batch-anrop

interface FlightDeal {
  date: string;
  price: number;
  currency: string;
  deepLink: string;
  direction: "outbound" | "return";
}

/* ── Amadeus OAuth2 token (cachad i minnet) ─────────────────────── */

let tokenCache: { token: string; expires: number } | null = null;

/* ── Flygpris-cache per månad (1 timme TTL) ─────────────────────── */

const flightCache = new Map<string, { data: FlightDeal[]; expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 timme

async function getAmadeusToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires) {
    return tokenCache.token;
  }

  const baseUrl =
    process.env.AMADEUS_BASE_URL ?? "https://api.amadeus.com";

  const res = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Amadeus token-fel ${res.status}: ${body}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    // Förnya 60 s innan den löper ut
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

/* ── Sökning per datum + origin ──────────────────────────────────── */

async function searchFlightsForDate(
  token: string,
  origin: string,
  destination: string,
  date: string,
  currency: string,
): Promise<{ price: number; currency: string; origin: string; destination: string; date: string } | null> {
  const baseUrl =
    process.env.AMADEUS_BASE_URL ?? "https://api.amadeus.com";

  const params = new URLSearchParams({
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate: date,
    adults: "1",
    nonStop: "true",
    currencyCode: currency,
    max: "1",
  });

  try {
    const res = await fetch(
      `${baseUrl}/v2/shopping/flight-offers?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.data || data.data.length === 0) return null;

    return {
      price: parseFloat(data.data[0].price.total),
      currency: data.data[0].price.currency,
      origin,
      destination,
      date,
    };
  } catch {
    return null;
  }
}

/* ── Hjälpfunktion: bygg bokningslänk till Skyscanner ───────────── */

function buildSearchLink(
  origin: string,
  destination: string,
  date: string,
): string {
  const [y, m, d] = date.split("-");
  const yy = y.slice(2);
  return `https://www.skyscanner.se/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${yy}${m}${d}/?adultsv2=1&cabinclass=economy&preferdirects=true&rtn=0`;
}

/* ── GET-handler ────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "");
  const month = parseInt(searchParams.get("month") ?? ""); // 1-indexed

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Ogiltiga parametrar" }, { status: 400 });
  }

  const apiKey = process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "AMADEUS_API_KEY / AMADEUS_API_SECRET saknas" },
      { status: 500 },
    );
  }

  // Returnera cachad data om den finns och är färsk
  const cacheKey = `${year}-${month}`;
  const cached = flightCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return NextResponse.json(cached.data);
  }

  let token: string;
  try {
    token = await getAmadeusToken(apiKey, apiSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Amadeus auth error:", msg);
    return NextResponse.json(
      { error: `Kunde inte autentisera mot Amadeus: ${msg}` },
      { status: 502 },
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sweAirports = ["GOT", "VXO"];
  const ALC = "ALC";
  const currency = "SEK";

  // Bygg lista med sökningar: båda riktningar × datum (bara framtida datum)
  const searches: { date: string; origin: string; destination: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    if (dateObj >= today) {
      const dateStr = `${year}-${pad(month)}-${pad(d)}`;
      for (const sweAirport of sweAirports) {
        searches.push({ date: dateStr, origin: sweAirport, destination: ALC }); // utresa
        searches.push({ date: dateStr, origin: ALC, destination: sweAirport }); // hemresa
      }
    }
  }

  // Sök parallellt i batchar om 10 (Amadeus free-tier: 10 req/s)
  const results: (Awaited<ReturnType<typeof searchFlightsForDate>>)[] = [];
  const BATCH_SIZE = 10;
  for (let i = 0; i < searches.length; i += BATCH_SIZE) {
    const batch = searches.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((s) =>
        searchFlightsForDate(token, s.origin, s.destination, s.date, currency),
      ),
    );
    results.push(...batchResults);
  }

  // Behåll billigaste flyget per dag och riktning
  const cheapestOutbound = new Map<string, FlightDeal>();
  const cheapestReturn = new Map<string, FlightDeal>();
  for (const r of results) {
    if (!r) continue;
    const isReturn = r.origin === ALC;
    const map = isReturn ? cheapestReturn : cheapestOutbound;
    const existing = map.get(r.date);
    if (!existing || r.price < existing.price) {
      map.set(r.date, {
        date: r.date,
        price: Math.round(r.price),
        currency: r.currency,
        deepLink: buildSearchLink(r.origin, r.destination, r.date),
        direction: isReturn ? "return" : "outbound",
      });
    }
  }

  const deals = [
    ...Array.from(cheapestOutbound.values()),
    ...Array.from(cheapestReturn.values()),
  ];

  // Spara i cache i 1 timme
  flightCache.set(cacheKey, { data: deals, expires: Date.now() + CACHE_TTL_MS });

  return NextResponse.json(deals);
}
