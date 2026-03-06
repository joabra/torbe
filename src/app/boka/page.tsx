"use client";
import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Users, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

interface BookedPeriod {
  id: string;
  checkIn: string;
  checkOut: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

function BokaForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  const [checkIn, setCheckIn] = useState(params.get("checkIn") ?? "");
  const [checkOut, setCheckOut] = useState(params.get("checkOut") ?? "");
  const [guests, setGuests] = useState(Number(params.get("guests") ?? 2));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [bookedPeriods, setBookedPeriods] = useState<BookedPeriod[]>([]);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data: Array<BookedPeriod & { status: string }>) => {
        const approved = data.filter((b) => b.status === "APPROVED");
        setBookedPeriods(approved);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/logga-in?callbackUrl=/boka");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIn, checkOut, guests, message }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
    } else {
      setError(data.error ?? "Något gick fel");
    }
  }

  if (success) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <Card className="max-w-md w-full text-center">
          <CardBody className="py-12">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-forest-900 mb-3">Bokning skickad!</h2>
            <p className="text-stone-500 leading-relaxed">
              Din bokningsförfrågan har skickats och väntar på godkännande av en admin.
              Du får svar inom kort.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button variant="sand" onClick={() => router.push("/mina-bokningar")}>
                Se mina bokningar
              </Button>
              <Button variant="ghost" onClick={() => router.push("/")}>
                Till startsidan
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Lägenhet</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Boka din vistelse</h1>
          <p className="mt-3 text-stone-500">
            Fyll i dina önskade datum. Bokningen godkänns av en familjeadmin.
          </p>
        </div>

        <Card>
          <CardHeader>
            <p className="font-semibold text-forest-800 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-sand-500" />
              Bokningsdetaljer
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="checkIn"
                  label="Incheckning"
                  type="date"
                  required
                  value={checkIn}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
                <Input
                  id="checkOut"
                  label="Utcheckning"
                  type="date"
                  required
                  value={checkOut}
                  min={checkIn || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-forest-800 block mb-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sand-500" />
                    Antal gäster
                  </span>
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sand-400"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "gäst" : "gäster"}</option>
                  ))}
                </select>
              </div>

              <Textarea
                id="message"
                label="Meddelande till admin (valfritt)"
                placeholder="Berätta gärna lite om ert sällskap..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="sand"
                size="lg"
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? "Skickar..." : "Skicka bokningsförfrågan"}
              </Button>

              <p className="text-center text-xs text-stone-400">
                Inloggad som <strong>{session?.user?.name}</strong>
              </p>
            </form>
          </CardBody>
        </Card>

        {/* Booked periods */}
        {bookedPeriods.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Redan bokade perioder
            </h2>
            <div className="space-y-2">
              {bookedPeriods.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-800"
                >
                  <CalendarDays className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formatDate(b.checkIn)} – {formatDate(b.checkOut)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BokaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-500">Laddar...</div>}>
      <BokaForm />
    </Suspense>
  );
}
