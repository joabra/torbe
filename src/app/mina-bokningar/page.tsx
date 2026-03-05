"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Clock } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateShort, statusLabel } from "@/lib/utils";

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message?: string;
  adminNote?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const statusVariant = {
  PENDING: "pending" as const,
  APPROVED: "approved" as const,
  REJECTED: "rejected" as const,
};

export default function MinaBokningarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/logga-in?callbackUrl=/mina-bokningar");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/bookings/mine")
        .then((r) => r.json())
        .then(setBookings)
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Konto</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Mina bokningar</h1>
          <p className="mt-2 text-stone-500">Hej {session?.user?.name?.split(" ")[0]}! Här ser du alla dina bokningar.</p>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardBody className="text-center py-16">
              <CalendarDays className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500 font-medium">Inga bokningar ännu</p>
              <p className="text-stone-400 text-sm mt-1">Boka ett datum för att komma hit!</p>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-forest-800 font-semibold">
                    <CalendarDays className="w-4 h-4 text-sand-500" />
                    {formatDateShort(booking.checkIn)} → {formatDateShort(booking.checkOut)}
                  </div>
                  <Badge variant={statusVariant[booking.status]}>
                    {statusLabel(booking.status)}
                  </Badge>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center gap-1.5 text-stone-500 text-sm mb-3">
                    <Users className="w-3.5 h-3.5" />
                    {booking.guests} {booking.guests === 1 ? "gäst" : "gäster"}
                    <span className="mx-2 text-stone-300">·</span>
                    <Clock className="w-3.5 h-3.5" />
                    Skickad {formatDateShort(booking.createdAt)}
                  </div>

                  {booking.message && (
                    <div className="bg-stone-50 rounded-xl p-3 text-sm text-stone-600 mb-3">
                      <span className="font-medium text-stone-700">Ditt meddelande: </span>
                      {booking.message}
                    </div>
                  )}

                  {booking.adminNote && (
                    <div className={`rounded-xl p-3 text-sm ${booking.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      <span className="font-medium">Admin: </span>
                      {booking.adminNote}
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
