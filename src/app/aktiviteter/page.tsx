"use client";
import { useEffect, useState } from "react";
import { MapPin, Globe, UtensilsCrossed, Map, ShoppingBag, PartyPopper, MoreHorizontal } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { categoryLabel } from "@/lib/utils";

interface Tip {
  id: string;
  category: string;
  title: string;
  description: string;
  address?: string;
  website?: string;
  imageUrl?: string;
  mapUrl?: string;
}

const categories = ["ALL", "RESTAURANT", "EXCURSION", "MARKET", "EVENT", "OTHER"];

const categoryIcons: Record<string, React.ReactNode> = {
  RESTAURANT: <UtensilsCrossed className="w-5 h-5" />,
  EXCURSION: <Map className="w-5 h-5" />,
  MARKET: <ShoppingBag className="w-5 h-5" />,
  EVENT: <PartyPopper className="w-5 h-5" />,
  OTHER: <MoreHorizontal className="w-5 h-5" />,
};

const categoryEmoji: Record<string, string> = {
  RESTAURANT: "🍽️",
  EXCURSION: "🏔️",
  MARKET: "🛍️",
  EVENT: "🎉",
  OTHER: "📍",
};

export default function AktiviteterPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tips")
      .then((r) => r.json())
      .then(setTips)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? tips : tips.filter((t) => t.category === filter);

  const sampleTips: Tip[] = [
    { id: "s1", category: "RESTAURANT", title: "El Varadero – Torre de la Horadada", description: "Topprestaurang i den charmiga fiskehamnen Torre de la Horadada, 2 km norrut. Perfekt friterad fisk och arroz caldoso.", address: "Puerto de Torre de la Horadada", imageUrl: "/tips/restaurant.jpg", mapUrl: "https://maps.google.com/?q=Torre+de+la+Horadada+puerto" },
    { id: "s2", category: "RESTAURANT", title: "Chiringuitos på Playa Mil Palmeras", description: "Strandbarerna längs vår strand serverar bocadillos, grillad fisk och kalla drycker. Perfekt lunch med fötterna i sanden.", address: "Playa de Mil Palmeras", imageUrl: "/tips/beach.jpg" },
    { id: "s3", category: "EXCURSION", title: "Lo Pagán – Gyttjebad & flamingos", description: "Bara 8 km söderut kan du bada i terapeutisk saltgyttja vid Mar Menors strand. Flamingor samlas i angränsande saltdammar. Gratis!", address: "Playa de Lo Pagán, San Pedro del Pinatar", imageUrl: "/tips/saltlake.jpg" },
    { id: "s4", category: "EXCURSION", title: "Torrevieja – Rosa saltsjöar", description: "15 km norrut ligger Europas mest spektakulära rosa saltsjöar med flamingor och naturpark. Glöm inte havspromenaden!", address: "Torrevieja, Alicante", imageUrl: "/tips/saltlake.jpg", website: "https://www.torrevieja.es" },
    { id: "s5", category: "EXCURSION", title: "Alicante – Slottet Santa Bárbara", description: "66 km norrut. Klättra upp till renässansslottet med panoramautsikt och promenera i gamla stan El Barrio.", address: "Castillo de Santa Bárbara, Alicante", imageUrl: "/tips/castle.jpg" },
    { id: "s6", category: "MARKET", title: "Torreviejas fredagsmarknad", description: "En av Costa Blancas största utomhusmarknader varje fredag 09–14. Kläder, lokala delikatesser, kryddor och hantverk.", address: "Torrevieja", imageUrl: "/tips/market.jpg" },
    { id: "s7", category: "MARKET", title: "La Zenia Boulevard", description: "Stort utomhusshopping-center 10 km norrut. Zara, H&M, restauranger och bio under spansk sol. Öppet till 22:00.", address: "Orihuela Costa", imageUrl: "/tips/shopping.jpg", website: "https://www.lazeniaboulevardonline.com" },
    { id: "s8", category: "EVENT", title: "Midsommarfirande – San Juan", description: "Natten till 24 juni tänds jättebål på alla stränder. Spanjorerna hoppar över elden, äter druvor i midnatt. Magiskt!", address: "Playa de Mil Palmeras & Torre de la Horadada", imageUrl: "/tips/beach.jpg" },
    { id: "s9", category: "OTHER", title: "Torre de la Horadada – Vakttorn (1591)", description: "Det medeltida vakttornet i angränsande byn byggdes 1591 mot pirater. Promenera längs charming hamnpromenad.", address: "Torre de la Horadada", imageUrl: "/tips/castle.jpg" },
    { id: "s10", category: "OTHER", title: "Romersk stentäkt – Playa Mil Palmeras", description: "På norra delen av vår strand finns rester av en romersk stentäkt från antiken — historia alldeles intill sanden!", address: "Playa de Mil Palmeras (norra delen)", imageUrl: "/tips/beach.jpg" },
  ];

  const displayTips = tips.length > 0 ? filtered : sampleTips.filter((t) => filter === "ALL" || t.category === filter);

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Utforska</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Aktiviteter & Tips</h1>
          <p className="mt-3 text-stone-500 max-w-xl mx-auto">
            Det bästa av Costa Blanca — restauranger, utflykter, marknader och event nära
            lägenheten i Mil Palmeras.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                filter === cat
                  ? "bg-forest-800 text-white shadow"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-forest-50"
              }`}
            >
              {cat !== "ALL" && <span>{categoryEmoji[cat]}</span>}
              {cat === "ALL" ? "Alla" : categoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Tips grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTips.map((tip) => (
              <Card key={tip.id} className="hover:shadow-md hover:-translate-y-0.5 transition-all">
                {/* Card top with image or emoji fallback */}
                {tip.imageUrl ? (
                  <div className="h-36 overflow-hidden">
                    <img src={tip.imageUrl} alt={tip.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-36 bg-gradient-to-br from-forest-50 to-sand-100 flex items-center justify-center text-6xl">
                    {categoryEmoji[tip.category]}
                  </div>
                )}
                <CardBody>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-forest-800 text-base leading-tight">{tip.title}</h3>
                    <Badge variant="category" className="shrink-0">{categoryLabel(tip.category)}</Badge>
                  </div>
                  <p className="text-stone-500 text-sm leading-relaxed line-clamp-3 mb-3">
                    {tip.description}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {tip.address && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-400">
                        <MapPin className="w-3.5 h-3.5 text-sand-400 shrink-0" />
                        {tip.address}
                      </div>
                    )}
                    {tip.website && (
                      <a
                        href={tip.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-forest-600 hover:text-forest-800 transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        Besök webbplats
                      </a>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {displayTips.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg">Inga tips i denna kategori ännu.</p>
            <p className="text-stone-300 text-sm mt-1">Admin kan lägga till tips via admin-panelen.</p>
          </div>
        )}

        {tips.length === 0 && !loading && (
          <p className="text-center text-xs text-sand-500 mt-8">
            ✨ Exempeltips visas — riktiga tips läggs till av admin
          </p>
        )}
      </div>
    </div>
  );
}
