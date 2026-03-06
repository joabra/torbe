"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BookOpen, Trash2, Send } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface GuestbookEntry {
  id: string;
  content: string;
  visitYear: number | null;
  createdAt: string;
  author: { id: string; name: string } | null;
}

export default function GastbokPage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [visitYear, setVisitYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadEntries() {
    const res = await fetch("/api/gastbok");
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/gastbok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), visitYear: visitYear || null }),
    });
    if (res.ok) {
      setContent("");
      setVisitYear("");
      await loadEntries();
    } else {
      const data = await res.json();
      setError(data.error ?? "Något gick fel");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/gastbok/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-forest-100 rounded-xl">
            <BookOpen className="h-6 w-6 text-forest-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Gästbok</h1>
            <p className="text-stone-500 text-sm">Dela ditt minne från Torbe</p>
          </div>
        </div>

        {/* Write entry form */}
        {session ? (
          <Card className="mb-8">
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Ditt minne
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Berätta om ditt besök…"
                    maxLength={2000}
                    rows={4}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
                    required
                  />
                  <p className="text-xs text-stone-400 mt-1 text-right">{content.length}/2000</p>
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      Besöksår (valfritt)
                    </label>
                    <input
                      type="number"
                      value={visitYear}
                      onChange={(e) => setVisitYear(e.target.value)}
                      placeholder={String(currentYear)}
                      min={1990}
                      max={currentYear}
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>
                  <Button type="submit" variant="sand" disabled={submitting || !content.trim()} className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {submitting ? "Skickar…" : "Publicera"}
                  </Button>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </form>
            </CardBody>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardBody>
              <p className="text-stone-600 text-sm text-center py-2">
                <a href="/logga-in" className="text-forest-700 font-medium hover:underline">Logga in</a> för att skriva i gästboken.
              </p>
            </CardBody>
          </Card>
        )}

        {/* Entries */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-center text-stone-500 py-6 text-sm">
                Inga inlägg ännu. Bli den första att skriva!
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const canDelete =
                (session?.user as { role?: string })?.role === "ADMIN" || session?.user?.id === entry.author?.id;
              return (
                <Card key={entry.id}>
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-stone-800 text-sm">
                            {entry.author?.name ?? "Anonym"}
                          </span>
                          {entry.visitYear && (
                            <span className="text-xs bg-forest-100 text-forest-700 rounded-full px-2 py-0.5 font-medium">
                              {entry.visitYear}
                            </span>
                          )}
                          <span className="text-xs text-stone-400">
                            {new Date(entry.createdAt).toLocaleDateString("sv-SE", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-stone-700 text-sm whitespace-pre-wrap break-words">
                          {entry.content}
                        </p>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="shrink-0 p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Ta bort"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
