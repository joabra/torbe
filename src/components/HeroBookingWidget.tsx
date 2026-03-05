"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function HeroBookingWidget() {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  function handleSearch() {
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));
    router.push(`/boka?${params.toString()}`);
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/60 px-4 py-4 flex flex-wrap md:flex-nowrap items-end gap-3 w-full max-w-3xl">
      {/* Room */}
      <div className="flex items-center gap-2 px-3 py-2 border-r border-stone-200 min-w-[110px]">
        <Home className="w-4 h-4 text-sand-500 shrink-0" />
        <div>
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">Lägenhet</p>
          <p className="text-sm font-semibold text-forest-900">Torbe</p>
        </div>
      </div>

      {/* Check-in */}
      <div className="flex items-center gap-2 px-3 py-2 border-r border-stone-200 flex-1 min-w-[130px]">
        <CalendarDays className="w-4 h-4 text-sand-500 shrink-0" />
        <div className="w-full">
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">Incheckning</p>
          <input
            type="date"
            value={checkIn}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full text-sm font-semibold text-forest-900 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Check-out */}
      <div className="flex items-center gap-2 px-3 py-2 border-r border-stone-200 flex-1 min-w-[130px]">
        <CalendarDays className="w-4 h-4 text-sand-500 shrink-0" />
        <div className="w-full">
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">Utcheckning</p>
          <input
            type="date"
            value={checkOut}
            min={checkIn || new Date().toISOString().split("T")[0]}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full text-sm font-semibold text-forest-900 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Guests */}
      <div className="flex items-center gap-2 px-3 py-2 border-r border-stone-200 min-w-[110px]">
        <Users className="w-4 h-4 text-sand-500 shrink-0" />
        <div>
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">Gäster</p>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="text-sm font-semibold text-forest-900 bg-transparent focus:outline-none cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "vuxen" : "vuxna"}</option>
            ))}
          </select>
        </div>
      </div>

      <Button variant="sand" size="md" onClick={handleSearch} className="shrink-0 w-full md:w-auto">
        Boka din vistelse
      </Button>
    </div>
  );
}
