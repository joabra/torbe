"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Instagram, ExternalLink, RefreshCw, Trash2 } from "lucide-react";

interface InstagramPost {
  id: string;
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

interface ApiResponse {
  posts: InstagramPost[];
  configured: boolean;
  error?: string;
}

interface VisitPhoto {
  id: string;
  url: string;
  caption?: string | null;
  createdAt: string;
  user?: { name: string } | null;
}

// Placeholder images when Instagram is not configured
const placeholderPosts = [
  { id: "p1", emoji: "🌊", caption: "Perfekta vågor vid solnedgången" },
  { id: "p2", emoji: "🏠", caption: "Hemma hos Torbe-familjen" },
  { id: "p3", emoji: "🌅", caption: "Magisk soluppgång från terrassen" },
  { id: "p4", emoji: "🍹", caption: "Sangria och sommarkvällar" },
  { id: "p5", emoji: "🌴", caption: "Palmerna svajar i brisen" },
  { id: "p6", emoji: "🏖️", caption: "Stranddag med hela familjen" },
  { id: "p7", emoji: "🍽️", caption: "Middag med havsutsikt" },
  { id: "p8", emoji: "🌺", caption: "Blommorna slår ut i maj" },
  { id: "p9", emoji: "🌄", caption: "Utsikt mot bergen" },
];

export default function BilderPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const role = (session?.user as { role?: string })?.role;
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<VisitPhoto[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [igRes, photoRes] = await Promise.all([
      fetch("/api/instagram"),
      fetch("/api/photos"),
    ]);
    const json = await igRes.json();
    setData(json);
    if (photoRes.ok) setPhotos(await photoRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDeletePhoto(id: string) {
    if (!confirm("Ta bort bilden?")) return;
    setDeletingPhotoId(id);
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
    setDeletingPhotoId(null);
  }

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Instagram</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Bildgalleri</h1>
          <p className="mt-3 text-stone-500 max-w-xl mx-auto">
            Tagga dina bilder med{" "}
            <span className="font-semibold text-forest-700">#torbespain</span>{" "}
            på Instagram för att de ska dyka upp här.
          </p>

          {data?.configured && (
            <button
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 text-sm text-stone-400 hover:text-forest-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Uppdatera
            </button>
          )}
        </div>

        {/* Instagram tag reminder */}
        <div className="bg-gradient-to-r from-forest-50 to-sand-100 rounded-2xl border border-sand-200 p-6 mb-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shrink-0">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-forest-900">Dela dina minnen!</p>
            <p className="text-sm text-stone-500 mt-0.5">
              Posta dina bilder på Instagram och tagga dem med <strong>#torbespain</strong>.
              De dyker automatiskt upp i detta galleri.
            </p>
          </div>
        </div>

        {/* Visit photos from guests */}
        {photos.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-forest-800 mb-4 flex items-center gap-2">
              📸 Bilder från era vistelser
            </h2>
            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {photos.map((photo) => (
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
                      {photo.user?.name && <span className="text-white/60 ml-1">— {photo.user.name.split(" ")[0]}</span>}
                    </div>
                  )}
                  {(role === "ADMIN" || photo.user?.name === session?.user?.name) && (
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-lg p-1.5 text-red-600 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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

        {/* Error */}
        {!loading && data?.error && (
          <div className="text-center py-8 text-stone-400">
            <p>Kunde inte hämta Instagram-bilder just nu.</p>
          </div>
        )}

        {/* Real Instagram posts */}
        {!loading && data?.configured && data.posts.length > 0 && (
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {data.posts.map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl overflow-hidden group relative break-inside-avoid"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.media_url}
                  alt={post.caption ?? "Instagram-bild"}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Placeholder grid when not configured */}
        {!loading && (!data?.configured || data.posts.length === 0) && (
          <>
            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {placeholderPosts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl overflow-hidden bg-gradient-to-br from-forest-50 to-sand-100 border border-stone-100 flex flex-col items-center justify-center p-8 break-inside-avoid aspect-square"
                >
                  <div className="text-6xl mb-3">{p.emoji}</div>
                  <p className="text-xs text-stone-400 text-center">{p.caption}</p>
                </div>
              ))}
            </div>

            {!data?.configured && (
              <div className="mt-10 text-center bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <p className="font-semibold text-amber-800">Instagram inte konfigurerat</p>
                <p className="text-sm text-amber-700 mt-1">
                  Lägg till <code className="bg-amber-100 px-1 rounded">INSTAGRAM_ACCESS_TOKEN</code> och{" "}
                  <code className="bg-amber-100 px-1 rounded">INSTAGRAM_HASHTAG_ID</code> i <code>.env</code> för att
                  aktivera det riktiga bildflödet.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
