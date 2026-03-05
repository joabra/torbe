// API-route för att hämta billiga direktflyg via Kiwi Tequila API.
// Registrera för en API-nyckel på https://tequila.kiwi.com och lägg till
// KIWI_API_KEY i din .env.local-fil.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface KiwiItinerary {
  local_departure: string; // ISO datetime
  price: number;
  deep_link: string;
  availability?: { seats: number };
}

interface KiwiResponse {
  data: KiwiItinerary[];
  currency: string;
}

interface FlightDeal {
  date: string;
  price: number;
  currency: string;
  deepLink: string;
}

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

  const pad = (n: number) => String(n).padStart(2, "0");
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const dateFrom = `${pad(firstDay.getDate())}/${pad(firstDay.getMonth() + 1)}/${firstDay.getFullYear()}`;
  const dateTo = `${pad(lastDay.getDate())}/${pad(lastDay.getMonth() + 1)}/${lastDay.getFullYear()}`;

  const apiKey = process.env.KIWI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "KIWI_API_KEY saknas" }, { status: 500 });
  }

  const params = new URLSearchParams({
    fly_from: "GOT,VXO",
    fly_to: "ALC",
    date_from: dateFrom,
    date_to: dateTo,
    max_stopovers: "0",
    limit: "30",
    sort: "price",
    currency: "SEK",
  });

  let kiwiData: KiwiResponse;
  try {
    const res = await fetch(`https://api.tequila.kiwi.com/v2/search?${params.toString()}`, {
      headers: { apikey: apiKey },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Kiwi API-fel" }, { status: 502 });
    }
    kiwiData = (await res.json()) as KiwiResponse;
  } catch {
    return NextResponse.json({ error: "Nätverksfel" }, { status: 502 });
  }

  // Gruppera per dag och behåll det billigaste flyget per dag
  const cheapestPerDay = new Map<string, FlightDeal>();
  for (const itinerary of kiwiData.data) {
    const departure = new Date(itinerary.local_departure);
    const dateKey = `${departure.getFullYear()}-${pad(departure.getMonth() + 1)}-${pad(departure.getDate())}`;
    const existing = cheapestPerDay.get(dateKey);
    if (!existing || itinerary.price < existing.price) {
      cheapestPerDay.set(dateKey, {
        date: dateKey,
        price: Math.round(itinerary.price),
        currency: kiwiData.currency,
        deepLink: itinerary.deep_link,
      });
    }
  }

  return NextResponse.json(Array.from(cheapestPerDay.values()));
}
