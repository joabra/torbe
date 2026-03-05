"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  status?: string;
  guestName?: string | null;
  user?: { name: string } | null;
}

interface FlightDeal {
  date: string;
  price: number;
  currency: string;
  deepLink: string;
  direction: "outbound" | "return";
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(date: Date, start: Date, end: Date) {
  const d = date.getTime();
  return d > start.getTime() && d < end.getTime();
}

function getBookingForDate(date: Date, bookings: Booking[]): Booking | undefined {
  return bookings.find((b) => {
    const s = new Date(b.checkIn);
    const e = new Date(b.checkOut);
    return isSameDay(date, s) || isSameDay(date, e) || isInRange(date, s, e);
  });
}

function getFlightsForDate(date: Date, flights: FlightDeal[]): { outbound?: FlightDeal; ret?: FlightDeal } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dayFlights = flights.filter((f) => f.date === key);
  return {
    outbound: dayFlights.find((f) => f.direction === "outbound"),
    ret: dayFlights.find((f) => f.direction === "return"),
  };
}

function firstNameOf(booking: Booking): string {
  const fullName = booking.user?.name ?? booking.guestName ?? "";
  return fullName.split(" ")[0];
}

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

export function BookingCalendar() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flights, setFlights] = useState<FlightDeal[]>([]);
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then(setBookings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session) return;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    fetch(`/api/flights?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setFlights(data);
      })
      .catch(() => {});
  }, [session, viewDate]);

  function prevMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  // Monday-based: 0=Mon, 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
        <button onClick={prevMonth} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <h2 className="font-bold text-forest-900">
          {MONTHS[month]} {year}
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-4 pt-4">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-stone-400 pb-2">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1 px-4 pb-4">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const past = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const booking = getBookingForDate(date, bookings);
          const booked = booking?.status === "APPROVED";
          const pending = booking?.status === "PENDING";
          const isToday = isSameDay(date, today);
          const firstName = booking ? firstNameOf(booking) : "";
          const { outbound: flightOut, ret: flightRet } = session ? getFlightsForDate(date, flights) : {};

          return (
            <div
              key={date.toISOString()}
              className={cn(
                "aspect-square flex flex-col items-center justify-start pt-1 rounded-xl text-sm font-medium transition-colors",
                past && "text-stone-300",
                !past && !booked && !pending && "text-forest-900 hover:bg-forest-50 cursor-default",
                booked && "bg-red-100 text-red-700 font-semibold",
                pending && "bg-amber-50 text-amber-700 font-semibold ring-1 ring-amber-300",
                isToday && !booked && !pending && "ring-2 ring-sand-400 ring-offset-1"
              )}
            >
              <span className={cn((booked || pending) && firstName ? "leading-none" : "")}>{date.getDate()}</span>
              {(booked || pending) && firstName && (
                <span className="text-[8px] leading-none mt-0.5 font-normal truncate max-w-full px-0.5">{firstName}</span>
              )}
              {pending && (
                <span className="text-[7px] leading-none mt-0.5 font-semibold px-1">väntar</span>
              )}
              {flightOut && (
                <a
                  href={flightOut.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 bg-green-100 text-green-700 text-[8px] font-semibold px-1 rounded-full leading-none hover:bg-green-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title={`Utresa till Alicante: ${flightOut.price} kr`}
                >
                  ↗ {flightOut.price}
                </a>
              )}
              {flightRet && (
                <a
                  href={flightRet.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 bg-sky-100 text-sky-700 text-[8px] font-semibold px-1 rounded-full leading-none hover:bg-sky-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title={`Hemresa från Alicante: ${flightRet.price} kr`}
                >
                  ↙ {flightRet.price}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-6 py-3 border-t border-stone-100 bg-stone-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-100 border border-red-300" />
          <span className="text-xs text-stone-500">Bokad</span>
        </div>
        {session && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-50 border border-amber-300" />
            <span className="text-xs text-stone-500">Väntar godkännande</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border-2 border-sand-400" />
          <span className="text-xs text-stone-500">Idag</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border border-stone-200" />
          <span className="text-xs text-stone-500">Ledig</span>
        </div>
        {session && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300" />
              <span className="text-xs text-stone-500">↗ Utresa till ALC</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-100 border border-sky-300" />
              <span className="text-xs text-stone-500">↙ Hemresa från ALC</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
