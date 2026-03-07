"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BellRing, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type FlightWatch = {
  id: string;
  origin: string;
  destination: string;
  direction: "OUTBOUND" | "RETURN";
  maxPrice: number;
  active: boolean;
  lastNotifiedAt?: string | null;
};

export function FlightWatchManager() {
  const { data: session } = useSession();
  const [watches, setWatches] = useState<FlightWatch[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    origin: "GOT",
    destination: "ALC",
    direction: "OUTBOUND" as "OUTBOUND" | "RETURN",
    maxPrice: 1200,
  });

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/flights/watch")
      .then((r) => (r.ok ? r.json() : []))
      .then(setWatches)
      .catch(() => setWatches([]));
  }, [session?.user]);

  async function addWatch() {
    setSaving(true);
    const res = await fetch("/api/flights/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        maxPrice: Number(form.maxPrice),
      }),
    });

    if (res.ok) {
      const created = await res.json();
      setWatches((prev) => [created, ...(prev ?? [])]);
    }
    setSaving(false);
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/flights/watch/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setWatches((prev) => (prev ?? []).map((w) => (w.id === id ? updated : w)));
  }

  async function removeWatch(id: string) {
    const res = await fetch(`/api/flights/watch/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setWatches((prev) => (prev ?? []).filter((w) => w.id !== id));
  }

  if (!session?.user) return null;

  return (
    <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-forest-800 mb-3">
        <BellRing className="w-4 h-4 text-sand-500" />
        Prisvakt för flyg
      </div>

      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <input
          value={form.origin}
          maxLength={3}
          onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value.toUpperCase() }))}
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
          placeholder="GOT"
        />
        <input
          value={form.destination}
          maxLength={3}
          onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value.toUpperCase() }))}
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
          placeholder="ALC"
        />
        <select
          value={form.direction}
          onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value as "OUTBOUND" | "RETURN" }))}
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm bg-white"
        >
          <option value="OUTBOUND">Utresa</option>
          <option value="RETURN">Hemresa</option>
        </select>
        <input
          type="number"
          min={100}
          max={10000}
          value={form.maxPrice}
          onChange={(e) => setForm((p) => ({ ...p, maxPrice: Number(e.target.value) }))}
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
          placeholder="Maxpris"
        />
      </div>

      <Button
        variant="sand"
        size="sm"
        disabled={saving || !form.origin || !form.destination || !form.maxPrice}
        onClick={addWatch}
      >
        {saving ? "Sparar..." : "Lägg till prisvakt"}
      </Button>

      <div className="mt-4 flex flex-col gap-2">
        {watches === null && <p className="text-xs text-stone-400">Laddar...</p>}
        {watches !== null && watches.length === 0 && <p className="text-xs text-stone-400">Inga prisvakter än.</p>}
        {(watches ?? []).map((w) => (
          <div key={w.id} className="rounded-xl border border-stone-200 px-3 py-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-700">
                {w.origin} → {w.destination} ({w.direction === "OUTBOUND" ? "Utresa" : "Hemresa"})
              </p>
              <p className="text-xs text-stone-500">Meddela under {w.maxPrice} kr</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(w.id, !w.active)}
                className={`text-xs font-semibold px-2 py-1 rounded-lg ${w.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}
              >
                {w.active ? "Aktiv" : "Pausad"}
              </button>
              <button onClick={() => removeWatch(w.id)} className="text-stone-300 hover:text-red-500 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
