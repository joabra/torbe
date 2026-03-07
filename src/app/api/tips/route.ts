import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const GEO_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;

function shouldRefreshGeocode(tip: {
  latitude: number | null;
  longitude: number | null;
  geocodedAt: Date | null;
}) {
  if (!tip.geocodedAt) return true;
  const age = Date.now() - new Date(tip.geocodedAt).getTime();
  const stale = age > GEO_REFRESH_MS;
  const hasCoords = Number.isFinite(tip.latitude) && Number.isFinite(tip.longitude);
  if (!hasCoords) return stale;
  return stale;
}

async function geocodeTip(query: string, apiKey: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };
    if (data.status !== "OK" || !data.results?.length) return null;
    const loc = data.results[0]?.geometry?.location;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

const CURATED_LOCATION_IMAGES: Record<string, string> = {
  "El Varadero – Torre de la Horadada": "https://upload.wikimedia.org/wikipedia/commons/e/e8/Puerto_deportivo_Torre_Horadada.jpg",
  "Chiringuitos på Playa Mil Palmeras": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Playa_de_las_Mil_Palmeras_%28Alicante%29.jpg/1920px-Playa_de_las_Mil_Palmeras_%28Alicante%29.jpg",
  "Lo Pagán – Gyttjebad & flamingos": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Vista_a%C3%A9rea_del_puerto_deportivo_de_Lo_Pag%C3%A1n_01.jpg/1920px-Vista_a%C3%A9rea_del_puerto_deportivo_de_Lo_Pag%C3%A1n_01.jpg",
  "Torrevieja – Rosa saltsjöar": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Laguna_Salada_de_Torrevieja_-_52451565734.jpg/1920px-Laguna_Salada_de_Torrevieja_-_52451565734.jpg",
  "Guardamar del Segura – Sanddynerna": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/R%C3%A1bita_Califal.JPG/1920px-R%C3%A1bita_Califal.JPG",
  "Alicante – Slottet Santa Bárbara": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Castillo_de_Santa_B%C3%A1rbara%2C_Alicante%2C_Espa%C3%B1a%2C_2014-07-04%2C_DD_61.JPG/1920px-Castillo_de_Santa_B%C3%A1rbara%2C_Alicante%2C_Espa%C3%B1a%2C_2014-07-04%2C_DD_61.JPG",
  "Torreviejas fredagsmarknad": "https://upload.wikimedia.org/wikipedia/commons/0/0c/Torrevieja_-_Mercado_Central_%27La_Plasa%27_3.jpg",
  "La Zenia Boulevard": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/La_Zenia_Boulevard_%2849287363646%29.jpg/1920px-La_Zenia_Boulevard_%2849287363646%29.jpg",
  "Midsommarfirande – San Juan": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Estado_de_la_playa_del_Orz%C3%A1n_despu%C3%A9s_de_la_noche_de_San_Juan_-_A_Coru%C3%B1a%2C_Galicia%2C_Spain_-_24_June_2010.jpg/1920px-Estado_de_la_playa_del_Orz%C3%A1n_despu%C3%A9s_de_la_noche_de_San_Juan_-_A_Coru%C3%B1a%2C_Galicia%2C_Spain_-_24_June_2010.jpg",
  "Torre de la Horadada – Vakttorn (1591)": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Club_n%C3%A1utico_de_Torre_de_la_Horadada_3.jpg/1920px-Club_n%C3%A1utico_de_Torre_de_la_Horadada_3.jpg",
  "Romersk stenstäkt – Playa Mil Palmeras": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Sea_Time_%2824023423%29.jpeg/1920px-Sea_Time_%2824023423%29.jpeg",
};

function resolveTipImage(title: string, imageUrl: string | null) {
  const curated = CURATED_LOCATION_IMAGES[title];
  if (!curated) return imageUrl;
  // Replace generic local placeholders with curated location photos.
  if (!imageUrl || imageUrl.startsWith("/tips/")) return curated;
  return imageUrl;
}

const schema = z.object({
  category: z.enum(["RESTAURANT", "EXCURSION", "MARKET", "EVENT", "OTHER"]),
  title: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
  address: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  mapUrl: z.string().url().optional().or(z.literal("")),
  openMonths: z.array(z.number().int().min(1).max(12)).optional(),
  seasonNote: z.string().max(200).optional(),
  priceLevel: z.number().int().min(1).max(3).optional(),
  familyFriendly: z.boolean().optional(),
  bestTimeToVisit: z.string().max(120).optional(),
  carRequired: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user ? (session.user as { id: string }).id : null;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let tips = await prisma.tip.findMany({ orderBy: { createdAt: "desc" } });

    if (apiKey) {
      for (const tip of tips) {
        if (!shouldRefreshGeocode(tip)) continue;
        const baseQuery = `${tip.address?.trim() || tip.title.trim()}, Torrevieja, Spain`;
        const fallbackQuery = `${tip.title.trim()}, Torrevieja, Spain`;

        let coords = await geocodeTip(baseQuery, apiKey);
        if (!coords && fallbackQuery !== baseQuery) {
          coords = await geocodeTip(fallbackQuery, apiKey);
        }

        if (coords) {
          await prisma.tip.update({
            where: { id: tip.id },
            data: {
              latitude: coords.lat,
              longitude: coords.lng,
              geocodedAt: new Date(),
            },
          });
        } else {
          // Avoid repeated requests on every page load when geocoding fails.
          await prisma.tip.update({
            where: { id: tip.id },
            data: { geocodedAt: new Date() },
          });
        }
      }

      tips = await prisma.tip.findMany({ orderBy: { createdAt: "desc" } });
    }

    const countMap: Record<string, number> = {};
    const visitCountMap: Record<string, number> = {};
    let votedSet = new Set<string>();
    const userVisitMap = new Map<string, { note: string | null; rating: number | null; visitedAt: Date }>();

    try {
      const allVotes = await prisma.tipVote.findMany({ select: { tipId: true, userId: true } });
      for (const v of allVotes) {
        countMap[v.tipId] = (countMap[v.tipId] ?? 0) + 1;
      }
      if (userId) {
        const userVotes = allVotes.filter((v) => v.userId === userId);
        votedSet = new Set(userVotes.map((v) => v.tipId));
      }
    } catch {
      // Votes table may not exist yet — return tips without vote info
    }

    try {
      const allVisits = await prisma.tipVisit.findMany({
        select: { tipId: true, userId: true, note: true, rating: true, visitedAt: true },
      });
      for (const v of allVisits) {
        visitCountMap[v.tipId] = (visitCountMap[v.tipId] ?? 0) + 1;
      }
      if (userId) {
        for (const v of allVisits) {
          if (v.userId === userId) {
            userVisitMap.set(v.tipId, { note: v.note, rating: v.rating, visitedAt: v.visitedAt });
          }
        }
      }
    } catch {
      // Visit table may not exist yet — return tips without visit info
    }

    return NextResponse.json(
      tips.map((t) => ({
        ...t,
        imageUrl: resolveTipImage(t.title, t.imageUrl),
        voteCount: countMap[t.id] ?? 0,
        userVoted: votedSet.has(t.id),
        visitCount: visitCountMap[t.id] ?? 0,
        userVisited: userVisitMap.has(t.id),
        userVisitNote: userVisitMap.get(t.id)?.note ?? null,
        userVisitRating: userVisitMap.get(t.id)?.rating ?? null,
        userVisitedAt: userVisitMap.get(t.id)?.visitedAt ?? null,
      }))
    );
  } catch (err) {
    console.error("[tips GET]", err);
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });

  const tip = await prisma.tip.create({
    data: { ...parsed.data, createdById: session.user.id },
  });
  return NextResponse.json(tip, { status: 201 });
}
