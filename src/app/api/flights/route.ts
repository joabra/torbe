// API-route för att hämta billiga direktflyg via Amadeus Flight Offers API.
// Skapa ett gratis utvecklarkonto på https://developers.amadeus.com och lägg
// till AMADEUS_API_KEY och AMADEUS_API_SECRET i din .env.local-fil.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface FlightDeal {
  date: string;
  price: number;
  currency: string;
  deepLink: string;
}

/* ── Amadeus OAuth2 token (cachad i minnet) ─────────────────────── */

let tokenCache: { token: string; expires: number } | null = null;

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
    throw new Error("Kunde inte hämta Amadeus-token");
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
): Promise<{ price: number; currency: string; origin: string; date: string } | null> {
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

  let token: string;
  try {
    token = await getAmadeusToken(apiKey, apiSecret);
  } catch {
    return NextResponse.json(
      { error: "Kunde inte autentisera mot Amadeus" },
      { status: 502 },
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const origins = ["GOT", "VXO"];
  const destination = "ALC";
  const currency = "SEK";

  // Bygg lista med sökningar: origin × datum (bara framtida datum)
  const searches: { date: string; origin: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    if (dateObj >= today) {
      const dateStr = `${year}-${pad(month)}-${pad(d)}`;
      for (const origin of origins) {
        searches.push({ date: dateStr, origin });
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
        searchFlightsForDate(token, s.origin, destination, s.date, currency),
      ),
    );
    results.push(...batchResults);
  }

  // Behåll billigaste flyget per dag
  const cheapestPerDay = new Map<string, FlightDeal>();
  for (const r of results) {
    if (!r) continue;
    const existing = cheapestPerDay.get(r.date);
    if (!existing || r.price < existing.price) {
      cheapestPerDay.set(r.date, {
        date: r.date,
        price: Math.round(r.price),
        currency: r.currency,
        deepLink: buildSearchLink(r.origin, destination, r.date),
      });
    }
  }

  return NextResponse.json(Array.from(cheapestPerDay.values()));
}
