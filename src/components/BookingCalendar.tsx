"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, X, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  status?: string;
  guestName?: string | null;
  user?: { name: string } | null;
}

const AIRLINE_NAMES: Record<string, string> = {
  FR: "Ryanair",
  DY: "Norwegian",
  SK: "SAS",
  VY: "Vueling",
  W6: "Wizz Air",
};

function airlineName(code: string) {
  return AIRLINE_NAMES[code] ?? code;
}

interface FlightDeal {
  date: string;
  price: number;
  currency: string;
  airline: string;
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
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flights, setFlights] = useState<FlightDeal[]>([]);
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectStart, setSelectStart] = useState<Date | null>(null);
  const [selectEnd, setSelectEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

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
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  function handleDateClick(date: Date, booked: boolean, past: boolean) {
    if (past || booked) return;
    if (!selectStart || selectEnd) {
      setSelectStart(date);
      setSelectEnd(null);
      return;
    }
    // Second click
    if (date <= selectStart) {
      setSelectStart(date);
      return;
    }
    // Check for booked days in range
    const hasConflict = bookings.some((b) => {
      if (b.status !== "APPROVED") return false;
      const s = new Date(b.checkIn);
      const e = new Date(b.checkOut);
      return (s > selectStart && s < date) || (e > selectStart && e < date);
    });
    if (hasConflict) {
      setSelectStart(date);
      setSelectEnd(null);
    } else {
      setSelectEnd(date);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
        {viewMode === "month" ? (
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-stone-600" />
          </button>
        ) : (
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, 0, 1))} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-stone-600" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-forest-900">
            {viewMode === "month" ? `${MONTHS[month]} ${year}` : `${year} — årsöversikt`}
          </h2>
          <button
            onClick={() => setViewMode(viewMode === "month" ? "year" : "month")}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-500 hover:text-forest-700"
            title={viewMode === "month" ? "Visa år" : "Visa månad"}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        {viewMode === "month" ? (
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-stone-600" />
          </button>
        ) : (
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, 0, 1))} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-stone-600" />
          </button>
        )}
      </div>

      {/* Year overview */}
      {viewMode === "year" && (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 12 }, (_, mi) => {
            const mYear = viewDate.getFullYear();
            const firstDayOfMonth = new Date(mYear, mi, 1);
            const startOff = (firstDayOfMonth.getDay() + 6) % 7;
            const daysInM = new Date(mYear, mi + 1, 0).getDate();
            const mCells: (number | null)[] = [];
            for (let i = 0; i < startOff; i++) mCells.push(null);
            for (let d = 1; d <= daysInM; d++) mCells.push(d);

            return (
              <div key={mi}>
                <p className="text-xs font-semibold text-forest-800 mb-1.5 text-center">{MONTHS[mi]}</p>
                <div className="grid grid-cols-7 gap-px">
                  {["M","T","O","T","F","L","S"].map((d, i) => (
                    <div key={i} className="text-center text-[9px] text-stone-300 font-semibold pb-0.5">{d}</div>
                  ))}
                  {mCells.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} />;
                    const cellDate = new Date(mYear, mi, day);
                    const b = getBookingForDate(cellDate, bookings);
                    const isApproved = b?.status === "APPROVED";
                    const isPend = b?.status === "PENDING";
                    const isTod = isSameDay(cellDate, today);
                    return (
                      <div
                        key={day}
                        className={cn(
                          "aspect-square flex items-center justify-center text-[9px] rounded-sm cursor-pointer",
                          isApproved && "bg-red-200 text-red-800 font-semibold",
                          isPend && !isApproved && "bg-amber-100 text-amber-700",
                          isTod && !isApproved && !isPend && "bg-sand-200 text-forest-800 font-semibold",
                          !isApproved && !isPend && !isTod && "text-stone-400 hover:bg-stone-50",
                        )}
                        onClick={() => {
                          setViewMode("month");
                          setViewDate(new Date(mYear, mi, 1));
                        }}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month view: Weekday headers */}
      {viewMode === "month" && (<>
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

          const past = date < todayMidnight;
          const booking = getBookingForDate(date, bookings);
          const booked = booking?.status === "APPROVED";
          const pending = booking?.status === "PENDING";
          const isToday = isSameDay(date, today);
          const firstName = booking ? firstNameOf(booking) : "";
          const { outbound: flightOut, ret: flightRet } = session ? getFlightsForDate(date, flights) : {};

          const isSelectStart = selectStart ? isSameDay(date, selectStart) : false;
          const isSelectEnd = selectEnd ? isSameDay(date, selectEnd) : false;
          const previewEnd = selectEnd ?? hoverDate;
          const inRange =
            selectStart != null &&
            previewEnd != null &&
            !isSameDay(date, selectStart) &&
            date > selectStart &&
            date < previewEnd;
          const isSelected = isSelectStart || isSelectEnd;
          const clickable = !past && !booked;

          return (
            <div
              key={date.toISOString()}
              onClick={() => handleDateClick(date, !!booked, past)}
              onMouseEnter={() => { if (selectStart && !selectEnd) setHoverDate(date); }}
              onMouseLeave={() => setHoverDate(null)}
              className={cn(
                "aspect-square flex flex-col items-center justify-start pt-1 rounded-xl text-sm font-medium transition-colors select-none",
                past && "text-stone-300 cursor-default",
                clickable && !isSelected && !inRange && "text-forest-900 hover:bg-forest-50 cursor-pointer",
                booked && "bg-red-100 text-red-700 font-semibold cursor-default",
                pending && !booked && "bg-amber-50 text-amber-700 font-semibold ring-1 ring-amber-300 cursor-default",
                isToday && !booked && !pending && !isSelected && "ring-2 ring-sand-400 ring-offset-1",
                inRange && !booked && !pending && "bg-forest-100 text-forest-800 rounded-none",
                isSelected && !booked && !pending && "bg-forest-600 text-white rounded-xl",
              )}
            >
              <span className={cn((booked || pending) && firstName ? "leading-none" : "")}>
                {date.getDate()}
              </span>
              {(booked || pending) && firstName && (
                <span className="text-[8px] leading-none mt-0.5 font-normal truncate max-w-full px-0.5">
                  {firstName}
                </span>
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
                  title={`${airlineName(flightOut.airline)} – utresa till Alicante: ${flightOut.price} kr`}
                >
                  ↗ {flightOut.price}
                </a>
              )}
              {flightRet && (
                <a
                  href={flightRet.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 bg-sky-100 text-sky-700 text-[8px] font-semibold px-1 rounded-full leading-none hover:bg-sky-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title={`${airlineName(flightRet.airline)} – hemresa från Alicante: ${flightRet.price} kr`}
                >
                  ↙ {flightRet.price}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Booking panel – shows when dates are selected */}
      {selectStart && (
        <div className="mx-4 mb-4 rounded-2xl border border-forest-200 bg-forest-50 px-5 py-4">
          {!selectEnd ? (
            <p className="text-sm text-forest-700 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>
                Incheckning:{" "}
                <strong>
                  {selectStart.toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
                </strong>
                {" "}— klicka nu på ett utcheckningsdatum.
              </span>
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 text-sm text-forest-800">
                <CalendarDays className="w-5 h-5 shrink-0 text-forest-600" />
                <div>
                  <p className="font-semibold">
                    {selectStart.toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
                    {" → "}
                    {selectEnd.toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
                  </p>
                  <p className="text-xs text-forest-600">
                    {Math.round((selectEnd.getTime() - selectStart.getTime()) / 86400000)} nätter
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectStart(null); setSelectEnd(null); }}
                  className="p-1.5 rounded-lg text-forest-500 hover:bg-forest-100 transition-colors"
                  title="Rensa val"
                >
                  <X className="w-4 h-4" />
                </button>
                <Button
                  variant="sand"
                  size="sm"
                  onClick={() => {
                    const fmt = (d: Date) => d.toISOString().split("T")[0];
                    router.push(`/boka?checkIn=${fmt(selectStart)}&checkOut=${fmt(selectEnd)}`);
                  }}
                >
                  Gå till bokning →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-t border-stone-100 bg-stone-50">
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
          <div className="w-3 h-3 rounded-full bg-forest-600" />
          <span className="text-xs text-stone-500">Valt datum</span>
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
      </>)}

    </div>
  );
}
