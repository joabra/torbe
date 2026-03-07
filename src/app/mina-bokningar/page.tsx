"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Clock, Trash2, Download, MessageSquare, Send, Camera, ChevronDown, Link2, CheckSquare, Square, CalendarPlus2, AlertCircle, ListChecks } from "lucide-react";
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

interface DateProposal {
  id: string;
  proposedCheckIn: string;
  proposedCheckOut: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

interface ChecklistItem {
  id: string;
  bookingId: string;
  content: string;
  completed: boolean;
  createdAt: string;
}

const statusVariant = {
  PENDING: "pending" as const,
  APPROVED: "approved" as const,
  REJECTED: "rejected" as const,
};

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

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

  // Calendar token for iCal feed
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarCopied, setCalendarCopied] = useState(false);

  // Date proposals
  const [proposals, setProposals] = useState<Record<string, DateProposal[]>>({});
  const [respondingProposal, setRespondingProposal] = useState<string | null>(null);

  // Checklist per booking
  const [expandedChecklist, setExpandedChecklist] = useState<Record<string, boolean>>({});
  const [checklistItems, setChecklistItems] = useState<Record<string, ChecklistItem[]>>({});
  const [newChecklistItem, setNewChecklistItem] = useState<Record<string, string>>({});
  const [savingChecklist, setSavingChecklist] = useState<Record<string, boolean>>({});

  // Waitlist
  const [showWaitlist, setShowWaitlist] = useState<string | null>(null);
  const [waitlistDates, setWaitlistDates] = useState<{ checkIn: string; checkOut: string; guests: string }>({ checkIn: "", checkOut: "", guests: "1" });
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

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

  async function handleGetCalendarUrl() {
    setCalendarLoading(true);
    const res = await fetch("/api/account/calendar-token");
    if (res.ok) {
      const data = await res.json();
      setCalendarUrl(data.url);
    }
    setCalendarLoading(false);
  }

  async function handleCopyCalendarUrl() {
    if (!calendarUrl) return;
    await navigator.clipboard.writeText(calendarUrl);
    setCalendarCopied(true);
    setTimeout(() => setCalendarCopied(false), 2000);
  }

  async function handleLoadProposals(bookingId: string) {
    const res = await fetch(`/api/bookings/${bookingId}/date-proposals`);
    if (res.ok) {
      const data = await res.json();
      setProposals((p) => ({ ...p, [bookingId]: data }));
    }
  }

  async function handleRespondProposal(bookingId: string, proposalId: string, status: "ACCEPTED" | "REJECTED") {
    setRespondingProposal(proposalId);
    const res = await fetch(`/api/bookings/${bookingId}/date-proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await handleLoadProposals(bookingId);
      if (status === "ACCEPTED") {
        const updatedBookingRes = await fetch("/api/bookings/mine");
        if (updatedBookingRes.ok) setBookings(await updatedBookingRes.json());
      }
    }
    setRespondingProposal(null);
  }

  async function handleJoinWaitlist(bookingId: string) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      setWaitlistDates({ checkIn: booking.checkIn.slice(0, 10), checkOut: booking.checkOut.slice(0, 10), guests: String(booking.guests) });
    }
    setShowWaitlist(bookingId);
  }

  async function handleSubmitWaitlist() {
    if (!waitlistDates.checkIn || !waitlistDates.checkOut) return;
    setWaitlistSubmitting(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIn: new Date(waitlistDates.checkIn).toISOString(),
        checkOut: new Date(waitlistDates.checkOut).toISOString(),
        guests: Number(waitlistDates.guests),
      }),
    });
    setWaitlistSubmitting(false);
    if (res.ok) {
      setShowWaitlist(null);
      alert("Du är nu med på väntelistan! Vi meddelar dig om de datumen blir lediga.");
    } else {
      const data = await res.json();
      alert(data.error ?? "Något gick fel");
    }
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

  async function handleToggleChecklist(bookingId: string) {
    const next = !expandedChecklist[bookingId];
    setExpandedChecklist((p) => ({ ...p, [bookingId]: next }));
    if (next && !checklistItems[bookingId]) {
      const res = await fetch(`/api/bookings/${bookingId}/checklist`);
      if (res.ok) {
        const data = await res.json();
        setChecklistItems((p) => ({ ...p, [bookingId]: data }));
      }
    }
  }

  async function handleAddChecklistItem(bookingId: string) {
    const content = (newChecklistItem[bookingId] ?? "").trim();
    if (!content) return;
    setSavingChecklist((p) => ({ ...p, [bookingId]: true }));
    const res = await fetch(`/api/bookings/${bookingId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const item = await res.json();
      setChecklistItems((p) => ({ ...p, [bookingId]: [...(p[bookingId] ?? []), item] }));
      setNewChecklistItem((p) => ({ ...p, [bookingId]: "" }));
    }
    setSavingChecklist((p) => ({ ...p, [bookingId]: false }));
  }

  async function handleToggleChecklistItem(bookingId: string, item: ChecklistItem) {
    const res = await fetch(`/api/bookings/${bookingId}/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setChecklistItems((p) => ({
      ...p,
      [bookingId]: (p[bookingId] ?? []).map((x) => (x.id === item.id ? updated : x)),
    }));
  }

  async function handleDeleteChecklistItem(bookingId: string, itemId: string) {
    const res = await fetch(`/api/bookings/${bookingId}/checklist/${itemId}`, { method: "DELETE" });
    if (!res.ok) return;
    setChecklistItems((p) => ({
      ...p,
      [bookingId]: (p[bookingId] ?? []).filter((x) => x.id !== itemId),
    }));
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

        {/* iCal calendar feed */}
        <div className="mb-6 p-4 bg-white rounded-2xl border border-stone-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <CalendarPlus2 className="w-4 h-4 text-sand-500 shrink-0" />
            <span>Prenumerera på alla dina bokningar i Google/Apple Calendar</span>
          </div>
          {calendarUrl ? (
            <div className="flex items-center gap-2">
              <code className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 truncate max-w-[180px]">{calendarUrl}</code>
              <button
                onClick={handleCopyCalendarUrl}
                className="text-xs font-semibold text-forest-700 hover:underline"
              >
                {calendarCopied ? "Kopierat!" : "Kopiera"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGetCalendarUrl}
              disabled={calendarLoading}
              className="flex items-center gap-1.5 text-xs font-semibold text-forest-700 border border-forest-200 rounded-lg px-3 py-1.5 hover:bg-forest-50 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              {calendarLoading ? "Genererar..." : "Hämta prenumerationslänk"}
            </button>
          )}
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

        {/* Waitlist modal */}
        {showWaitlist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowWaitlist(null)}>
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-forest-900 mb-4">Gå med på väntelistan</h3>
              <p className="text-sm text-stone-500 mb-4">Vi meddelar dig om dessa datum blir lediga.</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">Incheckning</label>
                  <input type="date" value={waitlistDates.checkIn}
                    onChange={(e) => setWaitlistDates((p) => ({ ...p, checkIn: e.target.value }))}
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">Utcheckning</label>
                  <input type="date" value={waitlistDates.checkOut}
                    onChange={(e) => setWaitlistDates((p) => ({ ...p, checkOut: e.target.value }))}
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">Antal gäster</label>
                  <input type="number" min="1" max="20" value={waitlistDates.guests}
                    onChange={(e) => setWaitlistDates((p) => ({ ...p, guests: e.target.value }))}
                    className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={() => setShowWaitlist(null)} className="flex-1">Avbryt</Button>
                  <Button variant="sand" onClick={handleSubmitWaitlist} disabled={waitlistSubmitting} className="flex-1">
                    {waitlistSubmitting ? "Sparar..." : "Bevaka datum"}
                  </Button>
                </div>
              </div>
            </div>
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
            {filtered.map((booking) => {
              const days = daysUntil(booking.checkIn);
              const isUpcoming = booking.status === "APPROVED" && days >= 0;
              const isOngoing = booking.status === "APPROVED" && days < 0 && daysUntil(booking.checkOut) >= 0;
              const bookingProposals = proposals[booking.id];

              return (
              <Card key={booking.id}>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-forest-800 font-semibold">
                    <CalendarDays className="w-4 h-4 text-sand-500" />
                    {formatDateShort(booking.checkIn)} → {formatDateShort(booking.checkOut)}
                  </div>
                  <div className="flex items-center gap-2">
                    {isUpcoming && days <= 30 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${days <= 7 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {days === 0 ? "Idag! 🎉" : `${days} dagar kvar`}
                      </span>
                    )}
                    {isOngoing && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sand-100 text-sand-700">Pågående 🌴</span>
                    )}
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

                  {/* Date proposals from admin */}
                  {booking.status === "PENDING" && (
                    <div className="mt-3">
                      <button
                        className="text-xs text-stone-400 hover:text-forest-700 transition-colors flex items-center gap-1"
                        onClick={() => {
                          if (!bookingProposals) handleLoadProposals(booking.id);
                          else setProposals((p) => { const n = { ...p }; delete n[booking.id]; return n; });
                        }}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {bookingProposals ? "Dölj datumförslag" : "Visa datumförslag från admin"}
                      </button>
                      {bookingProposals && bookingProposals.length > 0 && (
                        <div className="mt-2 flex flex-col gap-2">
                          {bookingProposals.map((proposal) => (
                            <div key={proposal.id} className={`rounded-xl p-3 text-sm ${proposal.status === "PENDING" ? "bg-amber-50 border border-amber-200" : proposal.status === "ACCEPTED" ? "bg-emerald-50 border border-emerald-200" : "bg-stone-50 border border-stone-200"}`}>
                              <p className="font-semibold text-stone-700 mb-1">
                                Admin föreslår: {formatDateShort(proposal.proposedCheckIn)} → {formatDateShort(proposal.proposedCheckOut)}
                              </p>
                              {proposal.status === "PENDING" && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleRespondProposal(booking.id, proposal.id, "ACCEPTED")}
                                    disabled={respondingProposal === proposal.id}
                                    className="px-3 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                  >Acceptera</button>
                                  <button
                                    onClick={() => handleRespondProposal(booking.id, proposal.id, "REJECTED")}
                                    disabled={respondingProposal === proposal.id}
                                    className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                  >Neka</button>
                                </div>
                              )}
                              {proposal.status !== "PENDING" && (
                                <span className={`text-xs font-semibold ${proposal.status === "ACCEPTED" ? "text-emerald-700" : "text-stone-500"}`}>
                                  {proposal.status === "ACCEPTED" ? "✓ Accepterat" : "✗ Nekat"}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {bookingProposals && bookingProposals.length === 0 && (
                        <p className="text-xs text-stone-400 mt-1">Inga förslag från admin ännu.</p>
                      )}
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
                    {booking.status === "REJECTED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleJoinWaitlist(booking.id)}
                        className="text-sand-600 hover:text-sand-800 hover:bg-sand-50 text-sm"
                      >
                        🔔 Bevaka dessa datum
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

                  {/* Checklist */}
                  {booking.status === "APPROVED" && (
                    <div className="mt-3 border-t border-stone-100 pt-3">
                      <button
                        onClick={() => handleToggleChecklist(booking.id)}
                        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-forest-700 transition-colors"
                      >
                        <ListChecks className="w-3.5 h-3.5" />
                        Checklista för resan
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedChecklist[booking.id] ? "rotate-180" : ""}`} />
                      </button>

                      {expandedChecklist[booking.id] && (
                        <div className="mt-3 flex flex-col gap-2">
                          {(checklistItems[booking.id] ?? []).length === 0 && (
                            <p className="text-xs text-stone-400 text-center py-2">Ingen checklistepunkt ännu</p>
                          )}

                          {(checklistItems[booking.id] ?? []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm">
                              <button
                                onClick={() => handleToggleChecklistItem(booking.id, item)}
                                className={`flex items-center gap-2 text-left ${item.completed ? "text-stone-400" : "text-stone-700"}`}
                              >
                                {item.completed ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-stone-400" />}
                                <span className={item.completed ? "line-through" : ""}>{item.content}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteChecklistItem(booking.id, item.id)}
                                className="text-stone-300 hover:text-red-500 transition-colors p-1"
                                title="Ta bort"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          <div className="flex gap-2 mt-1">
                            <input
                              type="text"
                              placeholder="Ny checklistepunkt..."
                              value={newChecklistItem[booking.id] ?? ""}
                              onChange={(e) => setNewChecklistItem((p) => ({ ...p, [booking.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddChecklistItem(booking.id);
                                }
                              }}
                              className="flex-1 text-sm rounded-xl border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400"
                            />
                            <button
                              onClick={() => handleAddChecklistItem(booking.id)}
                              disabled={savingChecklist[booking.id] || !newChecklistItem[booking.id]?.trim()}
                              className="px-3 py-2 rounded-xl bg-forest-700 text-white hover:bg-forest-800 transition-colors disabled:opacity-50"
                            >
                              {savingChecklist[booking.id] ? "..." : "+"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
            );})}
          </div>
        )}
      </div>
    </div>
  );
}
