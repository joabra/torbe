"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ExternalLink, Instagram, Link2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface VisitPhoto {
  id: string;
  url: string;
  caption?: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
  booking?: { checkIn: string; checkOut: string } | null;
}

interface InstagramLink {
  id: string;
  permalink: string;
  imageUrl?: string | null;
  caption?: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

interface PhotoGroup {
  label: string;
  photos: VisitPhoto[];
}

export default function BilderPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const role = (session?.user as { role?: string })?.role;
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<VisitPhoto[]>([]);
  const [links, setLinks] = useState<InstagramLink[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  const [permalink, setPermalink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [linkError, setLinkError] = useState("");

  async function load() {
    setLoading(true);
    const [photoRes, linksRes] = await Promise.all([
      fetch("/api/photos"),
      fetch("/api/instagram-links"),
    ]);
    if (photoRes.ok) setPhotos(await photoRes.json());
    if (linksRes.ok) setLinks(await linksRes.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleDeletePhoto(id: string) {
    if (!confirm("Ta bort bilden?")) return;
    setDeletingPhotoId(id);
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
    setDeletingPhotoId(null);
  }

  async function handleDeleteLink(id: string) {
    if (!confirm("Ta bort länken?")) return;
    setDeletingLinkId(id);
    const res = await fetch(`/api/instagram-links/${id}`, { method: "DELETE" });
    if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
    setDeletingLinkId(null);
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkError("");
    setSavingLink(true);

    const res = await fetch("/api/instagram-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permalink: permalink.trim(),
        imageUrl: imageUrl.trim() || undefined,
        caption: caption.trim() || undefined,
      }),
    });

    if (res.ok) {
      const created = await res.json();
      setLinks((prev) => [created, ...prev]);
      setPermalink("");
      setImageUrl("");
      setCaption("");
    } else {
      const data = await res.json().catch(() => ({}));
      setLinkError(data.error ?? "Kunde inte spara länken");
    }

    setSavingLink(false);
  }

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Familjens bilder</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Bildgalleri</h1>
          <p className="mt-3 text-stone-500 max-w-2xl mx-auto">
            Galleriet visar era uppladdade vistelsebilder och manuellt delade Instagram-länkar.
            Ingen Business-koppling krävs.
          </p>

          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 text-sm text-stone-400 hover:text-forest-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Uppdatera
          </button>
        </div>

        {/* Instagram tag reminder */}
        <div className="bg-gradient-to-r from-forest-50 to-sand-100 rounded-2xl border border-sand-200 p-6 mb-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shrink-0">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-forest-900">Dela dina minnen enkelt</p>
            <p className="text-sm text-stone-500 mt-0.5">
              Ladda upp bilder via era bokningar och/eller klistra in länk till ett Instagram-inlägg.
            </p>
          </div>
        </div>

        {session && (
          <div className="mb-12 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-forest-700" />
              <h2 className="text-lg font-semibold text-forest-800">Lägg till Instagram-länk</h2>
            </div>
            <form onSubmit={handleAddLink} className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  value={permalink}
                  onChange={(e) => setPermalink(e.target.value)}
                  label="Instagram-länk"
                  placeholder="https://www.instagram.com/p/..."
                  required
                />
              </div>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                label="Bild-URL (valfritt)"
                placeholder="https://...jpg"
              />
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                label="Bildtext (valfritt)"
                placeholder="Kort beskrivning"
                maxLength={300}
              />
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <p className="text-xs text-stone-400">Tips: oppna Instagram-inlagget och kopiera lanken.</p>
                <Button type="submit" size="sm" variant="sand" disabled={savingLink || !permalink.trim()}>
                  {savingLink ? "Sparar..." : "Spara lank"}
                </Button>
              </div>
              {linkError && <p className="md:col-span-2 text-sm text-red-600">{linkError}</p>}
            </form>
          </div>
        )}

        {!session && (
          <div className="mb-12 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            <a href="/logga-in" className="text-forest-700 font-medium hover:underline">Logga in</a> for att lagga till Instagram-lankar.
          </div>
        )}

        {links.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-forest-800 mb-6 flex items-center gap-2">Delade Instagram-lankar</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {links.map((link) => {
                const canDelete = role === "ADMIN" || link.user?.id === userId;
                return (
                  <div key={link.id} className="group relative rounded-2xl overflow-hidden border border-stone-200 bg-white">
                    {link.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={link.imageUrl} alt={link.caption ?? "Instagram-lank"} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-forest-50 to-sand-100 flex flex-col items-center justify-center">
                        <Instagram className="w-8 h-8 text-forest-700" />
                        <p className="text-xs text-stone-500 mt-2">Instagram-lank</p>
                      </div>
                    )}
                    <div className="p-3">
                      {link.caption && <p className="text-sm text-stone-700 mb-1">{link.caption}</p>}
                      <p className="text-xs text-stone-400">
                        Delad av {link.user?.name?.split(" ")[0] ?? "familjemedlem"}
                      </p>
                      <a
                        href={link.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-forest-700 hover:underline"
                      >
                        Oppna inlagg <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        disabled={deletingLinkId === link.id}
                        className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-lg p-1.5 text-red-600 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Ta bort lank"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-forest-800 mb-6 flex items-center gap-2">
              Bilder fran era vistelser
            </h2>
            {(() => {
              const groups: PhotoGroup[] = [];
              const seen = new Map<string, VisitPhoto[]>();
              for (const photo of photos) {
                const year = photo.booking
                  ? new Date(photo.booking.checkIn).getFullYear().toString()
                  : new Date(photo.createdAt).getFullYear().toString();
                if (!seen.has(year)) seen.set(year, []);
                seen.get(year)!.push(photo);
              }
              Array.from(seen.entries())
                .sort(([a], [b]) => Number(b) - Number(a))
                .forEach(([year, ps]) => groups.push({ label: year, photos: ps }));

              return groups.map((group) => (
                <div key={group.label} className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg font-bold text-forest-700">{group.label}</span>
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-xs text-stone-400">{group.photos.length} {group.photos.length === 1 ? "bild" : "bilder"}</span>
                  </div>
                  <div className="columns-2 md:columns-3 gap-4 space-y-4">
                    {group.photos.map((photo) => {
                      const canDelete = role === "ADMIN" || photo.user?.id === userId;
                      return (
                        <div key={photo.id} className="relative break-inside-avoid group rounded-2xl overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.caption ?? "Vistelsebild"}
                            className="w-full h-auto object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-3 py-2">
                              {photo.caption}
                              {photo.user?.name && <span className="text-white/60 ml-1">- {photo.user.name.split(" ")[0]}</span>}
                            </div>
                          )}
                          {!photo.caption && photo.user?.name && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/30 text-white text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {photo.user.name.split(" ")[0]}
                            </div>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
                              disabled={deletingPhotoId === photo.id}
                              className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-lg p-1.5 text-red-600 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Ta bort bild"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
            {session && (
              <p className="text-xs text-stone-400 text-center mt-4">
                Ladda upp egna bilder från <a href="/mina-bokningar" className="text-forest-600 hover:underline">Mina bokningar</a>
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && links.length === 0 && photos.length === 0 && (
          <div className="mt-10 text-center bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <p className="font-semibold text-amber-800">Inga bilder an</p>
            <p className="text-sm text-amber-700 mt-1">
              Lagg till Instagram-lank manuellt eller ladda upp en bild via en bokning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
