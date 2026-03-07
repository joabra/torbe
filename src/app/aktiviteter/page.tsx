"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Globe, Map, Plus, Pencil, Trash2, X, Heart, Calendar, Navigation } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  createdById?: string;
  voteCount?: number;
  userVoted?: boolean;
  openMonths?: number[];
  seasonNote?: string;
}

const CATEGORIES = ["RESTAURANT", "EXCURSION", "MARKET", "EVENT", "OTHER"] as const;
type TipCategory = typeof CATEGORIES[number];

const categories = ["ALL", ...CATEGORIES];

const categoryEmoji: Record<string, string> = {
  RESTAURANT: "🍽️",
  EXCURSION: "🏔️",
  MARKET: "🛍️",
  EVENT: "🎉",
  OTHER: "📍",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

function TipModal({
  tip,
  onClose,
  onSaved,
}: {
  tip?: Tip;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    category: (tip?.category ?? "RESTAURANT") as TipCategory,
    title: tip?.title ?? "",
    description: tip?.description ?? "",
    address: tip?.address ?? "",
    website: tip?.website ?? "",
    imageUrl: tip?.imageUrl ?? "",
    mapUrl: tip?.mapUrl ?? "",
    openMonths: tip?.openMonths ?? [] as number[],
    seasonNote: tip?.seasonNote ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(tip?.id && !tip.id.startsWith("s"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));

    const res = await fetch(isEdit ? `/api/tips/${tip!.id}` : "/api/tips", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Något gick fel");
    } else {
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-forest-900">{isEdit ? "Redigera tips" : "Lägg till tips"}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Kategori */}
          <div>
            <label className="text-sm font-semibold text-stone-700 block mb-1.5">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${form.category === cat ? "bg-forest-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-forest-50"}`}>
                  {categoryEmoji[cat]} {categoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          <Input id="title" label="Rubrik *" required value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="T.ex. Fantastisk strandrestaurang" />
          <div>
            <label htmlFor="description" className="text-sm font-semibold text-stone-700 block mb-1.5">Beskrivning *</label>
            <textarea id="description" required rows={3}
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
              value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Berätta varför detta är värt ett besök..." />
          </div>
          <Input id="address" label="Adress" value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Gata, Stad" />
          <Input id="website" label="Webbplats (URL)" type="url" value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
          <Input id="imageUrl" label="Bild-URL" type="url" value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
          <Input id="mapUrl" label="Google Maps-länk" type="url" value={form.mapUrl}
            onChange={(e) => setForm((f) => ({ ...f, mapUrl: e.target.value }))} placeholder="https://maps.google.com/..." />

          {/* Säsongsinfo */}
          <div>
            <label className="text-sm font-semibold text-stone-700 block mb-1.5">Öppet månader (valfritt)</label>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS.map((m, i) => {
                const month = i + 1;
                const selected = form.openMonths.includes(month);
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        openMonths: selected
                          ? f.openMonths.filter((x) => x !== month)
                          : [...f.openMonths, month].sort((a, b) => a - b),
                      }))
                    }
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${selected ? "bg-forest-700 text-white" : "bg-stone-100 text-stone-500 hover:bg-forest-50"}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-stone-400 mt-1">Lämna tomt om platsen är öppen hela året.</p>
          </div>
          <Input id="seasonNote" label="Säsongsnotering" value={form.seasonNote}
            onChange={(e) => setForm((f) => ({ ...f, seasonNote: e.target.value }))} placeholder="T.ex. Stängt november–mars" />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Avbryt</Button>
            <Button type="submit" variant="sand" disabled={loading} className="flex-1">
              {loading ? "Sparar..." : isEdit ? "Spara ändringar" : "Lägg till tips"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getDirectionsUrl(tip: Tip) {
  const destination = tip.address?.trim() || tip.title.trim();
  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function TipDetailsModal({ tip, onClose }: { tip: Tip; onClose: () => void }) {
  const directionsUrl = getDirectionsUrl(tip);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {tip.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tip.imageUrl} alt={tip.title} className="w-full h-56 object-cover" />
        ) : (
          <div className="h-56 bg-gradient-to-br from-forest-50 to-sand-100 flex items-center justify-center text-7xl">
            {categoryEmoji[tip.category]}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-forest-900">{tip.title}</h2>
              <p className="mt-1 text-sm text-stone-500">{categoryLabel(tip.category)}</p>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600" aria-label="Stang detaljvy">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-4 text-stone-700 leading-relaxed whitespace-pre-wrap">{tip.description}</p>

          <div className="mt-5 space-y-2">
            {tip.seasonNote && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {tip.seasonNote}
              </p>
            )}
            {tip.openMonths && tip.openMonths.length > 0 && tip.openMonths.length < 12 && (
              <p className="text-sm text-stone-500 inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Oppet: {tip.openMonths.map((m) => MONTHS[m - 1]).join(", ")}
              </p>
            )}
            {tip.address && (
              <p className="text-sm text-stone-600 inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sand-500" />
                {tip.address}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-800 text-white text-sm font-semibold hover:bg-forest-900 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Vagbeskrivning
              </a>
            )}
            {tip.mapUrl && (
              <a
                href={tip.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-sm font-semibold text-forest-700 hover:bg-forest-50 transition-colors"
              >
                <Map className="w-4 h-4" />
                Visa pa karta
              </a>
            )}
            {tip.website && (
              <a
                href={tip.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-sm font-semibold text-forest-700 hover:bg-forest-50 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Besok webbplats
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AktiviteterPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const role = (session?.user as { role?: string })?.role;
  const isLoggedIn = Boolean(session?.user);

  const [tips, setTips] = useState<Tip[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<"ALL" | "CURRENT">("ALL");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTip, setEditTip] = useState<Tip | undefined>();
  const [detailTip, setDetailTip] = useState<Tip | null>(null);

  async function fetchTips() {
    const res = await fetch("/api/tips");
    const data = await res.json();
    return data as Tip[];
  }

  function loadTips() {
    setLoading(true);
    fetchTips()
      .then(setTips)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTips()
      .then(setTips)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(tip: Tip) {
    if (!confirm(`Ta bort tipset "${tip.title}"?`)) return;
    await fetch(`/api/tips/${tip.id}`, { method: "DELETE" });
    loadTips();
  }

  async function handleVote(tip: Tip) {
    if (!isLoggedIn) return;
    // Optimistic update
    setTips((prev) =>
      prev.map((t) =>
        t.id === tip.id
          ? { ...t, userVoted: !t.userVoted, voteCount: (t.voteCount ?? 0) + (t.userVoted ? -1 : 1) }
          : t
      )
    );
    await fetch(`/api/tips/${tip.id}/vote`, { method: "POST" });
  }

  function canEdit(tip: Tip) {
    if (!isLoggedIn) return false;
    return role === "ADMIN" || tip.createdById === userId;
  }

  const currentMonth = new Date().getMonth() + 1;
  const filtered = tips.filter((t) => {
    const categoryOk = filter === "ALL" || t.category === filter;
    const favoriteOk = !favoritesOnly || Boolean(t.userVoted);
    const seasonOk =
      seasonFilter === "ALL" ||
      !t.openMonths ||
      t.openMonths.length === 0 ||
      t.openMonths.includes(currentMonth);
    return categoryOk && favoriteOk && seasonOk;
  });

  const sampleTips: Tip[] = [
    { id: "s1", category: "RESTAURANT", title: "El Varadero – Torre de la Horadada", description: "Topprestaurang i den charmiga fiskehamnen Torre de la Horadada, 2 km norrut. Perfekt friterad fisk och arroz caldoso.", address: "Puerto de Torre de la Horadada", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Puerto_deportivo_Torre_Horadada.jpg" },
    { id: "s2", category: "RESTAURANT", title: "Chiringuitos på Playa Mil Palmeras", description: "Strandbarerna längs vår strand serverar bocadillos, grillad fisk och kalla drycker. Perfekt lunch med fötterna i sanden.", address: "Playa de Mil Palmeras", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Playa_de_las_Mil_Palmeras_%28Alicante%29.jpg/1920px-Playa_de_las_Mil_Palmeras_%28Alicante%29.jpg" },
    { id: "s3", category: "EXCURSION", title: "Lo Pagán – Gyttjebad & flamingos", description: "Bara 8 km söderut kan du bada i terapeutisk saltgyttja vid Mar Menors strand. Flamingor och naturpark. Gratis!", address: "Lo Pagán, San Pedro del Pinatar", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Vista_a%C3%A9rea_del_puerto_deportivo_de_Lo_Pag%C3%A1n_01.jpg/1920px-Vista_a%C3%A9rea_del_puerto_deportivo_de_Lo_Pag%C3%A1n_01.jpg" },
    { id: "s4", category: "EXCURSION", title: "Torrevieja – Rosa saltsjöar", description: "15 km norrut. Europas vackraste rosa saltsjöar med flamingor och naturpark. Glöm inte havspromenaden!", address: "Torrevieja, Alicante", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Laguna_Salada_de_Torrevieja_-_52451565734.jpg/1920px-Laguna_Salada_de_Torrevieja_-_52451565734.jpg" },
    { id: "s5", category: "EXCURSION", title: "Alicante – Slottet Santa Bárbara", description: "66 km norrut. Renässansslott med panoramautsikt och gamla stan El Barrio.", address: "Castillo de Santa Bárbara, Alicante", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Castillo_de_Santa_B%C3%A1rbara%2C_Alicante%2C_Espa%C3%B1a%2C_2014-07-04%2C_DD_61.JPG/1920px-Castillo_de_Santa_B%C3%A1rbara%2C_Alicante%2C_Espa%C3%B1a%2C_2014-07-04%2C_DD_61.JPG" },
    { id: "s6", category: "MARKET", title: "Torreviejas fredagsmarknad", description: "En av Costa Blancas största marknader varje fredag 09–14. Kläder, delikatesser och hantverk.", address: "Torrevieja", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Torrevieja_-_Mercado_Central_%27La_Plasa%27_3.jpg" },
    { id: "s7", category: "MARKET", title: "La Zenia Boulevard", description: "Stort utomhusshopping 10 km norrut. Zara, H&M, restauranger och bio. Öppet till 22:00.", address: "Orihuela Costa", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/La_Zenia_Boulevard_%2849287363646%29.jpg/1920px-La_Zenia_Boulevard_%2849287363646%29.jpg" },
    { id: "s8", category: "EVENT", title: "Midsommarfirande – San Juan", description: "Natten till 24 juni tänds jättebål längs hela kusten. Eldverk och folk som hoppar över elden. Magiskt!", address: "Playa de Mil Palmeras", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Estado_de_la_playa_del_Orz%C3%A1n_despu%C3%A9s_de_la_noche_de_San_Juan_-_A_Coru%C3%B1a%2C_Galicia%2C_Spain_-_24_June_2010.jpg/1920px-Estado_de_la_playa_del_Orz%C3%A1n_despu%C3%A9s_de_la_noche_de_San_Juan_-_A_Coru%C3%B1a%2C_Galicia%2C_Spain_-_24_June_2010.jpg" },
    { id: "s9", category: "OTHER", title: "Torre de la Horadada – Vakttorn (1591)", description: "Medeltida vakttorn byggt mot pirater. Charmig hamnpromenad med glass och utsikt.", address: "Torre de la Horadada", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Club_n%C3%A1utico_de_Torre_de_la_Horadada_3.jpg/1920px-Club_n%C3%A1utico_de_Torre_de_la_Horadada_3.jpg" },
    { id: "s10", category: "OTHER", title: "Romersk stentäkt – Playa Mil Palmeras", description: "Rester av en romersk stentäkt från antiken — historia alldeles intill sanden!", address: "Playa de Mil Palmeras (norra delen)", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Sea_Time_%2824023423%29.jpeg/1920px-Sea_Time_%2824023423%29.jpeg" },
  ];

  const displayTips = tips.length > 0 ? filtered : sampleTips.filter((t) => filter === "ALL" || t.category === filter);

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      {(showModal || editTip) && (
        <TipModal
          tip={editTip}
          onClose={() => { setShowModal(false); setEditTip(undefined); }}
          onSaved={loadTips}
        />
      )}
      {detailTip && <TipDetailsModal tip={detailTip} onClose={() => setDetailTip(null)} />}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Utforska</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Aktiviteter & Tips</h1>
          <p className="mt-3 text-stone-500 max-w-xl mx-auto">
            Det bästa av Costa Blanca — restauranger, utflykter, marknader och event nära lägenheten i Mil Palmeras.
          </p>
          {isLoggedIn && (
            <Button variant="sand" onClick={() => { setEditTip(undefined); setShowModal(true); }} className="mt-5 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Lägg till tips
            </Button>
          )}
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

        {tips.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {isLoggedIn && (
              <button
                onClick={() => setFavoritesOnly((v) => !v)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${favoritesOnly ? "bg-red-100 text-red-700 border border-red-200" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"}`}
              >
                {favoritesOnly ? "Visar: Mina favoriter" : "Mina favoriter"}
              </button>
            )}
            <button
              onClick={() => setSeasonFilter((v) => (v === "ALL" ? "CURRENT" : "ALL"))}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${seasonFilter === "CURRENT" ? "bg-sand-100 text-sand-800 border border-sand-200" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"}`}
            >
              {seasonFilter === "CURRENT" ? "Visar: Aktuellt nu" : "Aktuellt nu"}
            </button>
          </div>
        )}

        {/* Tips grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTips.map((tip) => (
              <Card
                key={tip.id}
                className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                onClick={() => setDetailTip(tip)}
              >
                {/* Card top */}
                {tip.imageUrl ? (
                  <div className="h-36 overflow-hidden relative">
                    <img src={tip.imageUrl} alt={tip.title} className="w-full h-full object-cover" />
                    {canEdit(tip) && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditTip(tip); }}
                          className="bg-white/90 backdrop-blur rounded-lg p-1.5 text-forest-700 hover:bg-white shadow-sm">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(tip); }}
                          className="bg-white/90 backdrop-blur rounded-lg p-1.5 text-red-600 hover:bg-white shadow-sm">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-36 bg-gradient-to-br from-forest-50 to-sand-100 flex items-center justify-center text-6xl relative">
                    {categoryEmoji[tip.category]}
                    {canEdit(tip) && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditTip(tip); }}
                          className="bg-white/90 backdrop-blur rounded-lg p-1.5 text-forest-700 hover:bg-white shadow-sm">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(tip); }}
                          className="bg-white/90 backdrop-blur rounded-lg p-1.5 text-red-600 hover:bg-white shadow-sm">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <CardBody>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-forest-800 text-base leading-tight">{tip.title}</h3>
                    <Badge variant="category" className="shrink-0">{categoryLabel(tip.category)}</Badge>
                  </div>
                  <p className="text-stone-500 text-sm leading-relaxed line-clamp-3 mb-3">{tip.description}</p>
                  <div className="flex flex-col gap-1.5">
                    {tip.seasonNote && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {tip.seasonNote}
                      </div>
                    )}
                    {tip.openMonths && tip.openMonths.length > 0 && tip.openMonths.length < 12 && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-400">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        Öppet: {tip.openMonths.map((m) => MONTHS[m - 1]).join(", ")}
                      </div>
                    )}
                    {tip.address && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-400">
                        <MapPin className="w-3.5 h-3.5 text-sand-400 shrink-0" />
                        {tip.address}
                      </div>
                    )}
                    {tip.mapUrl && (
                      <a href={tip.mapUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-forest-600 hover:text-forest-800 transition-colors">
                        <Map className="w-3.5 h-3.5 shrink-0" />
                        Visa på karta
                      </a>
                    )}
                    {tip.website && (
                      <a href={tip.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-forest-600 hover:text-forest-800 transition-colors">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        Besök webbplats
                      </a>
                    )}
                  </div>
                  {/* Vote button */}
                  {!tip.id.startsWith("s") && (
                    <div className="mt-3 pt-3 border-t border-stone-100 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(tip);
                        }}
                        disabled={!isLoggedIn}
                        title={isLoggedIn ? (tip.userVoted ? "Ta bort gillning" : "Gilla detta tips") : "Logga in för att gilla"}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          tip.userVoted
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : isLoggedIn
                            ? "bg-stone-50 text-stone-400 border border-stone-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                            : "bg-stone-50 text-stone-300 border border-stone-200 cursor-default"
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${tip.userVoted ? "fill-current" : ""}`} />
                        {tip.voteCount ?? 0}
                      </button>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {displayTips.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg">Inga tips i denna kategori ännu.</p>
            {isLoggedIn && (
              <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-forest-600 hover:underline">
                + Lägg till det första tipset
              </button>
            )}
          </div>
        )}

        {tips.length === 0 && !loading && (
          <p className="text-center text-xs text-sand-500 mt-8">
            ✨ Exempeltips visas — logga in för att lägga till riktiga tips
          </p>
        )}
      </div>
    </div>
  );
}

