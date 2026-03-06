"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Clock, Trash2, Download, MessageSquare, Send, Camera, ChevronDown } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

interface BookingMessage {
  id: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
  author?: { name: string } | null;
}

const statusVariant = {
  PENDING: "pending" as const,
  APPROVED: "approved" as const,
  REJECTED: "rejected" as const,
};

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function MinaBokningarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Messages state
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, BookingMessage[]>>({});
  const [newMessage, setNewMessage] = useState<Record<string, string>>({});
  const [sendingMessage, setSendingMessage] = useState<Record<string, boolean>>({});

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>({});

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

  async function handleCancel(id: string) {
    if (!confirm("Avboka denna önskning?")) return;
    setCancellingId(id);
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } else {
      const data = await res.json();
      alert(data.error ?? "Något gick fel");
    }
    setCancellingId(null);
  }

  async function handleToggleMessages(bookingId: string) {
    const next = !expandedMessages[bookingId];
    setExpandedMessages((p) => ({ ...p, [bookingId]: next }));
    if (next && !messages[bookingId]) {
      const res = await fetch(`/api/bookings/${bookingId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages((p) => ({ ...p, [bookingId]: data }));
      }
    }
  }

  async function handleSendMessage(bookingId: string) {
    const content = newMessage[bookingId]?.trim();
    if (!content) return;
    setSendingMessage((p) => ({ ...p, [bookingId]: true }));
    const res = await fetch(`/api/bookings/${bookingId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((p) => ({ ...p, [bookingId]: [...(p[bookingId] ?? []), msg] }));
      setNewMessage((p) => ({ ...p, [bookingId]: "" }));
    }
    setSendingMessage((p) => ({ ...p, [bookingId]: false }));
  }

  async function handlePhotoUpload(bookingId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading((p) => ({ ...p, [bookingId]: true }));

    const caption = prompt("Lägg till en bildtext (valfritt):");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "photos");
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
    const uploadData = await uploadRes.json();

    if (uploadRes.ok) {
      await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploadData.url, bookingId, caption: caption ?? undefined }),
      });
      alert("Bilden har laddats upp och visas i bildgalleriet!");
    } else {
      alert("Uppladdning misslyckades");
    }
    setPhotoUploading((p) => ({ ...p, [bookingId]: false }));
    e.target.value = "";
  }

  if (status === "loading" || loading) {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = filter === "ALL" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Konto</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Mina bokningar</h1>
          <p className="mt-2 text-stone-500">Hej {session?.user?.name?.split(" ")[0]}! Här ser du alla dina bokningar.</p>
        </div>

        {/* Filter tabs */}
        {bookings.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f ? "bg-forest-800 text-white" : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-50"}`}
              >
                {f === "ALL" ? `Alla (${bookings.length})` : f === "PENDING" ? `Önskningar (${bookings.filter(b => b.status === "PENDING").length})` : f === "APPROVED" ? `Godkända (${bookings.filter(b => b.status === "APPROVED").length})` : `Avslagna (${bookings.filter(b => b.status === "REJECTED").length})`}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardBody className="text-center py-16">
              <CalendarDays className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500 font-medium">{bookings.length === 0 ? "Inga bokningar ännu" : "Inga bokningar med valt filter"}</p>
              <p className="text-stone-400 text-sm mt-1">{bookings.length === 0 ? "Boka ett datum för att komma hit!" : ""}</p>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-forest-800 font-semibold">
                    <CalendarDays className="w-4 h-4 text-sand-500" />
                    {formatDateShort(booking.checkIn)} → {formatDateShort(booking.checkOut)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[booking.status]}>
                      {statusLabel(booking.status)}
                    </Badge>
                    {booking.status === "PENDING" && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="text-stone-300 hover:text-red-500 transition-colors p-1"
                        title="Avboka"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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

                  {/* Actions */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {booking.status === "PENDING" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm"
                      >
                        {cancellingId === booking.id ? "Avbokar..." : "Avboka önskning"}
                      </Button>
                    )}
                    {booking.status === "APPROVED" && (
                      <>
                        <a
                          href={`/api/bookings/${booking.id}/ical`}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-500 border border-stone-200 hover:bg-stone-50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Lägg till i kalender (.ics)
                        </a>
                        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-200 transition-colors cursor-pointer ${photoUploading[booking.id] ? "text-stone-300 bg-stone-50 pointer-events-none" : "text-stone-500 hover:bg-stone-50"}`}>
                          <Camera className="w-3.5 h-3.5" />
                          {photoUploading[booking.id] ? "Laddar upp..." : "Dela bild"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(booking.id, e)}
                            disabled={photoUploading[booking.id]}
                          />
                        </label>
                      </>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <button
                      onClick={() => handleToggleMessages(booking.id)}
                      className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-forest-700 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Meddelanden till admin
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedMessages[booking.id] ? "rotate-180" : ""}`} />
                    </button>

                    {expandedMessages[booking.id] && (
                      <div className="mt-3 flex flex-col gap-2">
                        {(messages[booking.id] ?? []).length === 0 && (
                          <p className="text-xs text-stone-400 text-center py-2">Inga meddelanden ännu — skriv ett meddelande nedan!</p>
                        )}
                        {(messages[booking.id] ?? []).map((msg) => (
                          <div key={msg.id} className={`rounded-xl px-3 py-2 text-sm ${msg.isAdmin ? "bg-forest-50 text-forest-800 ml-6" : "bg-stone-50 text-stone-700 mr-6"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold">{msg.isAdmin ? "Admin" : (msg.author?.name ?? "Du")}</span>
                              <span className="text-xs text-stone-400">{new Date(msg.createdAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}</span>
                            </div>
                            {msg.content}
                          </div>
                        ))}
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            placeholder="Skriv ett meddelande..."
                            value={newMessage[booking.id] ?? ""}
                            onChange={(e) => setNewMessage((p) => ({ ...p, [booking.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(booking.id); } }}
                            className="flex-1 text-sm rounded-xl border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400"
                          />
                          <button
                            onClick={() => handleSendMessage(booking.id)}
                            disabled={sendingMessage[booking.id] || !newMessage[booking.id]?.trim()}
                            className="px-3 py-2 rounded-xl bg-forest-700 text-white hover:bg-forest-800 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
