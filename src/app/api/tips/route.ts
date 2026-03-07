import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

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

    const tips = await prisma.tip.findMany({ orderBy: { createdAt: "desc" } });

    const countMap: Record<string, number> = {};
    let votedSet = new Set<string>();

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

    return NextResponse.json(
      tips.map((t) => ({
        ...t,
        imageUrl: resolveTipImage(t.title, t.imageUrl),
        voteCount: countMap[t.id] ?? 0,
        userVoted: votedSet.has(t.id),
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
