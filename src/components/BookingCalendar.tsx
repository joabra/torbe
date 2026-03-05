"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  guestName?: string | null;
  user?: { name: string } | null;
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then(setBookings)
      .catch(() => {});
  }, []);

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
          const booked = !!booking;
          const isToday = isSameDay(date, today);
          const firstName = booked ? firstNameOf(booking!) : "";

          return (
            <div
              key={date.toISOString()}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-full text-sm font-medium transition-colors",
                past && "text-stone-300",
                !past && !booked && "text-forest-900 hover:bg-forest-50 cursor-default",
                booked && "bg-red-100 text-red-700 font-semibold",
                isToday && !booked && "ring-2 ring-sand-400 ring-offset-1"
              )}
            >
              <span className={cn(booked && firstName ? "leading-none" : "")}>{date.getDate()}</span>
              {booked && firstName && (
                <span className="text-[8px] leading-none mt-0.5 font-normal truncate max-w-full px-0.5">{firstName}</span>
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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border-2 border-sand-400" />
          <span className="text-xs text-stone-500">Idag</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border border-stone-200" />
          <span className="text-xs text-stone-500">Ledig</span>
        </div>
      </div>
    </div>
  );
}
