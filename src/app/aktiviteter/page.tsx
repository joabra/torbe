"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Globe, Map, Plus, Pencil, Trash2, X, Heart, Calendar, Navigation, List, Star } from "lucide-react";
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
  priceLevel?: number | null;
  familyFriendly?: boolean | null;
  bestTimeToVisit?: string | null;
  carRequired?: boolean | null;
  visitCount?: number;
  userVisited?: boolean;
  userVisitNote?: string | null;
  userVisitRating?: number | null;
  userVisitedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocodedAt?: string | null;
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

const TRIPADVISOR_INSPIRED_TITLES = new Set([
  "Playa de La Mata",
  "Parque Natural de las Lagunas de La Mata y Torrevieja",
  "El Meson De La Costa",
  "Bodegon Riojano",
  "Restaurante Vela Centro",
]);

function isTripadvisorInspiredTip(tip: Tip) {
  return TRIPADVISOR_INSPIRED_TITLES.has(tip.title);
}

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
    priceLevel: tip?.priceLevel ?? 2,
    familyFriendly: tip?.familyFriendly ?? false,
    bestTimeToVisit: tip?.bestTimeToVisit ?? "",
    carRequired: tip?.carRequired ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(tip?.id);

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

          {/* Snabbfakta */}
          <div className="rounded-xl border border-stone-200 p-3 bg-stone-50/60">
            <p className="text-sm font-semibold text-stone-700 mb-2">Snabbfakta</p>
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Prisnivå</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priceLevel: level }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      form.priceLevel === level
                        ? "bg-forest-700 text-white"
                        : "bg-white text-stone-600 border border-stone-200 hover:bg-forest-50"
                    }`}
                  >
                    {"€".repeat(level)}
                  </button>
                ))}
              </div>
            </div>

            <Input
              id="bestTimeToVisit"
              label="Bäst tid på dagen"
              value={form.bestTimeToVisit}
              onChange={(e) => setForm((f) => ({ ...f, bestTimeToVisit: e.target.value }))}
              placeholder="T.ex. kväll / tidig morgon"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, familyFriendly: !f.familyFriendly }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  form.familyFriendly
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {form.familyFriendly ? "Barnvänligt: Ja" : "Barnvänligt: Nej"}
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, carRequired: !f.carRequired }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  form.carRequired
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {form.carRequired ? "Bil krävs: Ja" : "Bil krävs: Nej"}
              </button>
            </div>
          </div>

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

let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMapsApi(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as { google?: unknown; __gmapsReady?: () => void };
  if (w.google) return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    w.__gmapsReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__gmapsReady`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Kunde inte ladda Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

function fallbackPosition(index: number) {
  const baseLat = 37.979;
  const baseLng = -0.683;
  const angle = (Math.PI * 2 * (index % 16)) / 16;
  const radius = 0.01 + (index % 5) * 0.003;
  return {
    lat: baseLat + Math.sin(angle) * radius,
    lng: baseLng + Math.cos(angle) * radius,
  };
}

function GoogleTipsMap({
  tips,
  activeTipId,
  onSelectTip,
}: {
  tips: Tip[];
  activeTipId: string | null;
  onSelectTip: (tipId: string) => void;
}) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    let mounted = true;

    async function setup() {
      if (!apiKey) {
        setMapError("Google Maps API-nyckel saknas (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).");
        return;
      }

      try {
        await loadGoogleMapsApi(apiKey);
      } catch {
        if (mounted) setMapError("Kunde inte ladda Google Maps just nu.");
        return;
      }

      if (!mounted || !mapElRef.current) return;

      const g = (window as any).google;
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(mapElRef.current, {
          center: { lat: 37.979, lng: -0.683 },
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
        });
        infoWindowRef.current = new g.maps.InfoWindow();
      }

      const map = mapRef.current;

      const positions = tips.map((tip, idx) => {
        if (typeof tip.latitude === "number" && typeof tip.longitude === "number") {
          return { lat: tip.latitude, lng: tip.longitude };
        }
        return fallbackPosition(idx);
      });
      if (!mounted) return;

      for (const m of markersRef.current) {
        m.setMap(null);
      }
      markersRef.current = [];

      const bounds = new g.maps.LatLngBounds();

      tips.forEach((tip, idx) => {
        const pos = positions[idx];
        const marker = new g.maps.Marker({
          position: pos,
          map,
          title: tip.title,
          label: {
            text: String(idx + 1),
            color: "#ffffff",
            fontWeight: "700",
          },
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#1f6b3a",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        marker.addListener("click", () => {
          onSelectTip(tip.id);
          infoWindowRef.current.setContent(`<b>${idx + 1}. ${tip.title}</b>`);
          infoWindowRef.current.open({ anchor: marker, map });
        });

        markersRef.current.push(marker);
        bounds.extend(pos);
      });

      if (tips.length === 1) {
        map.setCenter(positions[0]);
        map.setZoom(14);
      } else if (activeTipId) {
        const focus = tips.find((t) => t.id === activeTipId);
        const focusIdx = focus ? tips.findIndex((t) => t.id === focus.id) : -1;
        const focusPos = focusIdx >= 0 ? positions[focusIdx] : null;
        if (focusPos) {
          map.setCenter(focusPos);
          map.setZoom(15);
        } else {
          map.fitBounds(bounds, 50);
        }
      } else {
        map.fitBounds(bounds, 50);
      }
    }

    setup();
    return () => {
      mounted = false;
    };
  }, [tips, activeTipId, onSelectTip, apiKey]);

  if (mapError) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center px-6 text-sm text-stone-500">
        {mapError}
      </div>
    );
  }

  return <div ref={mapElRef} className="w-full h-[60vh]" />;
}

function TipDetailsModal({
  tip,
  onClose,
  isLoggedIn,
  onVisitChanged,
}: {
  tip: Tip;
  onClose: () => void;
  isLoggedIn: boolean;
  onVisitChanged: () => void;
}) {
  const directionsUrl = getDirectionsUrl(tip);
  const [visitNote, setVisitNote] = useState(tip.userVisitNote ?? "");
  const [visitRating, setVisitRating] = useState<number>(tip.userVisitRating ?? 5);
  const [visitSaving, setVisitSaving] = useState(false);

  async function handleSaveVisit() {
    if (!isLoggedIn) return;
    setVisitSaving(true);
    await fetch(`/api/tips/${tip.id}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: visitNote, rating: visitRating }),
    });
    setVisitSaving(false);
    onVisitChanged();
  }

  async function handleRemoveVisit() {
    if (!isLoggedIn) return;
    setVisitSaving(true);
    await fetch(`/api/tips/${tip.id}/visit`, { method: "DELETE" });
    setVisitSaving(false);
    onVisitChanged();
  }

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

          {isTripadvisorInspiredTip(tip) && (
            <p className="mt-3 inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Källa: Tripadvisor-inspirerat tips
            </p>
          )}

          <div className="mt-5 space-y-2">
            <p className="text-sm text-stone-500 inline-flex items-center gap-2">
              Besök loggade: {tip.visitCount ?? 0}
            </p>
            {tip.priceLevel && (
              <p className="text-sm text-stone-500 inline-flex items-center gap-2">
                Prisnivå: {"€".repeat(tip.priceLevel)}
              </p>
            )}
            {typeof tip.familyFriendly === "boolean" && (
              <p className="text-sm text-stone-500 inline-flex items-center gap-2">
                Barnvänligt: {tip.familyFriendly ? "Ja" : "Nej"}
              </p>
            )}
            {tip.bestTimeToVisit && (
              <p className="text-sm text-stone-500 inline-flex items-center gap-2">
                Bäst tid: {tip.bestTimeToVisit}
              </p>
            )}
            {typeof tip.carRequired === "boolean" && (
              <p className="text-sm text-stone-500 inline-flex items-center gap-2">
                Bil krävs: {tip.carRequired ? "Ja" : "Nej"}
              </p>
            )}
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

          <div className="mt-6 rounded-xl border border-stone-200 p-4 bg-stone-50/60">
            <p className="text-sm font-semibold text-stone-700 mb-2">Besökslogg</p>
            {!isLoggedIn ? (
              <p className="text-xs text-stone-500">Logga in för att markera att du varit här.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Ditt betyg</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setVisitRating(n)}
                        className={`p-1 rounded ${visitRating >= n ? "text-amber-500" : "text-stone-300"}`}
                        aria-label={`Satt betyg ${n}`}
                      >
                        <Star className={`w-4 h-4 ${visitRating >= n ? "fill-current" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={visitNote}
                  onChange={(e) => setVisitNote(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  placeholder="Skriv en kort anteckning om ditt besok"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveVisit}
                    disabled={visitSaving}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-forest-800 text-white text-xs font-semibold hover:bg-forest-900 disabled:opacity-60"
                  >
                    {visitSaving ? "Sparar..." : tip.userVisited ? "Uppdatera logg" : "Jag har varit har"}
                  </button>
                  {tip.userVisited && (
                    <button
                      type="button"
                      onClick={handleRemoveVisit}
                      disabled={visitSaving}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-60"
                    >
                      Ta bort min logg
                    </button>
                  )}
                </div>
              </div>
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
  const [viewMode, setViewMode] = useState<"LIST" | "MAP">("LIST");
  const [activeMapTipId, setActiveMapTipId] = useState<string | null>(null);

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
  const displayTips = tips.filter((t) => {
    const categoryOk = filter === "ALL" || t.category === filter;
    const favoriteOk = !favoritesOnly || Boolean(t.userVoted);
    const seasonOk =
      seasonFilter === "ALL" ||
      !t.openMonths ||
      t.openMonths.length === 0 ||
      t.openMonths.includes(currentMonth);
    return categoryOk && favoriteOk && seasonOk;
  });

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      {(showModal || editTip) && (
        <TipModal
          tip={editTip}
          onClose={() => { setShowModal(false); setEditTip(undefined); }}
          onSaved={loadTips}
        />
      )}
      {detailTip && (
        <TipDetailsModal
          tip={detailTip}
          onClose={() => setDetailTip(null)}
          isLoggedIn={isLoggedIn}
          onVisitChanged={loadTips}
        />
      )}

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
            <button
              onClick={() => setViewMode((v) => (v === "LIST" ? "MAP" : "LIST"))}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors inline-flex items-center gap-1.5 ${viewMode === "MAP" ? "bg-forest-800 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"}`}
            >
              {viewMode === "MAP" ? <List className="w-4 h-4" /> : <Map className="w-4 h-4" />}
              {viewMode === "MAP" ? "Listvy" : "Kartvy"}
            </button>
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

        {/* Tips grid / map */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          viewMode === "LIST" ? (
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
                  {isTripadvisorInspiredTip(tip) && (
                    <p className="mb-3 inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                      Källa: Tripadvisor
                    </p>
                  )}
                  {(tip.priceLevel || typeof tip.familyFriendly === "boolean" || tip.bestTimeToVisit || typeof tip.carRequired === "boolean") && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {tip.priceLevel && (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600">
                          {"€".repeat(tip.priceLevel)}
                        </span>
                      )}
                      {typeof tip.familyFriendly === "boolean" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                          {tip.familyFriendly ? "Barnvänligt" : "Ej barnvänligt"}
                        </span>
                      )}
                      {tip.bestTimeToVisit && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                          {tip.bestTimeToVisit}
                        </span>
                      )}
                      {typeof tip.carRequired === "boolean" && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                          {tip.carRequired ? "Bil krävs" : "Ingen bil krävs"}
                        </span>
                      )}
                    </div>
                  )}
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
                </CardBody>
              </Card>
              ))}
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1.1fr_1.6fr] gap-6">
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <button
                  onClick={() => setActiveMapTipId(null)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${activeMapTipId === null ? "border-forest-600 bg-forest-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}
                >
                  <p className="text-sm font-bold text-forest-900">Visa alla tips</p>
                  <p className="text-xs text-stone-500 mt-1">Kartoversikt med flera markeringar</p>
                </button>
                {displayTips.map((tip, idx) => {
                  const active = activeMapTipId === tip.id;
                  return (
                    <button
                      key={tip.id}
                      onClick={() => setActiveMapTipId(tip.id)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${active ? "border-forest-600 bg-forest-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}
                    >
                      <p className="text-sm font-bold text-forest-900">{idx + 1}. {tip.title}</p>
                      {tip.address && <p className="text-xs text-stone-500 mt-1">{tip.address}</p>}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white min-h-[60vh]">
                {displayTips.length > 0 ? (
                  <GoogleTipsMap tips={displayTips} activeTipId={activeMapTipId} onSelectTip={setActiveMapTipId} />
                ) : (
                  <div className="h-[60vh] flex items-center justify-center text-stone-400">Inga tips att visa pa kartan.</div>
                )}
              </div>
            </div>
          )
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
      </div>
    </div>
  );
}

