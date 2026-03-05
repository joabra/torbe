"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Users, CalendarDays, MessageSquare, Plus, UtensilsCrossed, Map, ShoppingBag, PartyPopper, MoreHorizontal, UserCheck, UserX, KeyRound, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateShort, statusLabel, categoryLabel } from "@/lib/utils";

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName?: string;
  message?: string;
  adminNote?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

interface Tip {
  id: string;
  category: string;
  title: string;
  description: string;
  address?: string;
  website?: string;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

const statusVariant = { PENDING: "pending" as const, APPROVED: "approved" as const, REJECTED: "rejected" as const };

const categoryIcons: Record<string, React.ReactNode> = {
  RESTAURANT: <UtensilsCrossed className="w-4 h-4" />,
  EXCURSION: <Map className="w-4 h-4" />,
  MARKET: <ShoppingBag className="w-4 h-4" />,
  EVENT: <PartyPopper className="w-4 h-4" />,
  OTHER: <MoreHorizontal className="w-4 h-4" />,
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;

  const [tab, setTab] = useState<"bookings" | "tips" | "users">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // New tip form
  const [showTipForm, setShowTipForm] = useState(false);
  const [tipForm, setTipForm] = useState({
    category: "RESTAURANT", title: "", description: "", address: "", website: "", imageUrl: "",
  });
  const [tipLoading, setTipLoading] = useState(false);
  const [tipImageLoading, setTipImageLoading] = useState(false);
  const [tipImageError, setTipImageError] = useState("");

  // New booking form (admin)
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState({ guestName: "", checkIn: "", checkOut: "", guests: 2, message: "", adminNote: "", status: "APPROVED" });
  const [bookingFormLoading, setBookingFormLoading] = useState(false);
  const [bookingFormError, setBookingFormError] = useState("");

  // User management
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "USER" });
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userFormError, setUserFormError] = useState("");
  const [changePwId, setChangePwId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && role !== "ADMIN")) {
      router.push("/");
    }
    if (status === "authenticated" && role === "ADMIN") {
      Promise.all([
        fetch("/api/admin/bookings").then((r) => r.json()),
        fetch("/api/tips").then((r) => r.json()),
        fetch("/api/admin/users").then((r) => r.json()),
      ]).then(([b, t, u]) => {
        setBookings(b);
        setTips(t);
        setAppUsers(u);
      }).finally(() => setLoading(false));
    }
  }, [status, role, router]);

  async function handleBookingAction(id: string, action: "APPROVED" | "REJECTED") {
    const note = adminNote[id] ?? "";
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, adminNote: note }),
    });
    if (res.ok) {
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: action, adminNote: note } : b));
    } else {
      const data = await res.json();
      alert(data.error);
    }
  }

  async function handleDeleteBooking(id: string) {
    if (!confirm("Är du säker på att du vill ta bort denna bokning?")) return;
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (res.ok) setBookings((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleAddBooking(e: React.FormEvent) {
    e.preventDefault();
    setBookingFormLoading(true);
    setBookingFormError("");
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...bookingForm, guests: Number(bookingForm.guests) }),
    });
    const data = await res.json();
    if (res.ok) {
      setBookings((prev) => [data, ...prev]);
      setBookingForm({ guestName: "", checkIn: "", checkOut: "", guests: 2, message: "", adminNote: "", status: "APPROVED" });
      setShowBookingForm(false);
    } else {
      setBookingFormError(data.error ?? "Något gick fel");
    }
    setBookingFormLoading(false);
  }

  async function handleAddTip(e: React.FormEvent) {
    e.preventDefault();
    setTipLoading(true);
    const res = await fetch("/api/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tipForm),
    });
    if (res.ok) {
      const newTip = await res.json();
      setTips((prev) => [newTip, ...prev]);
      setTipForm({ category: "RESTAURANT", title: "", description: "", address: "", website: "", imageUrl: "" });
      setShowTipForm(false);
    }
    setTipLoading(false);
  }

  async function handleTipImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTipImageLoading(true);
    setTipImageError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setTipForm((p) => ({ ...p, imageUrl: data.url }));
    } else {
      setTipImageError(data.error ?? "Uppladdning misslyckades");
    }
    setTipImageLoading(false);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  async function handleDeleteTip(id: string) {
    if (!confirm("Ta bort detta tips?")) return;
    const res = await fetch(`/api/tips/${id}`, { method: "DELETE" });
    if (res.ok) setTips((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleUserAction(id: string, action: "approve" | "reject") {
    const confirmMsg = action === "reject" ? "Ta bort detta konto permanent?" : "Godkänn detta konto?";
    if (!confirm(confirmMsg)) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      if (action === "approve") {
        setAppUsers((prev) => prev.map((u) => u.id === id ? { ...u, approved: true } : u));
      } else {
        setAppUsers((prev) => prev.filter((u) => u.id !== id));
      }
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Ta bort användaren permanent? Alla bokningar och tips raderas med.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAppUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      const data = await res.json();
      alert(data.error);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setUserFormLoading(true);
    setUserFormError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    const data = await res.json();
    if (res.ok) {
      setAppUsers((prev) => [data, ...prev]);
      setUserForm({ name: "", email: "", password: "", role: "USER" });
      setShowUserForm(false);
    } else {
      setUserFormError(data.error ?? "Något gick fel");
    }
    setUserFormLoading(false);
  }

  async function handleChangePassword(id: string) {
    if (newPassword.length < 6) return;
    setPwLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-password", password: newPassword }),
    });
    if (res.ok) {
      setChangePwId(null);
      setNewPassword("");
    } else {
      const data = await res.json();
      alert(data.error);
    }
    setPwLoading(false);
  }

  if (status === "loading" || loading) {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending = bookings.filter((b) => b.status === "PENDING");
  const pendingUsers = appUsers.filter((u) => !u.approved);

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Administration</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Admin-panel</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Väntande bokningar", value: pending.length, color: "bg-amber-50 text-amber-700" },
            { label: "Godkända bokningar", value: bookings.filter((b) => b.status === "APPROVED").length, color: "bg-emerald-50 text-emerald-700" },
            { label: "Användare inväntar", value: pendingUsers.length, color: pendingUsers.length > 0 ? "bg-red-50 text-red-700" : "bg-forest-50 text-forest-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-2xl p-4 text-center`}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["bookings", "tips", "users"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${tab === t ? "bg-forest-800 text-white" : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"}`}
            >
              {t === "bookings" ? `Bokningar (${pending.length} önskningar)` : t === "tips" ? "Tips & aktiviteter" : `Användare${pendingUsers.length > 0 ? ` (⚠️ ${pendingUsers.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Bookings tab */}
        {tab === "bookings" && (
          <div className="flex flex-col gap-4">
            {/* Lägg till bokning */}
            <div className="flex justify-end">
              <Button variant="sand" size="sm" onClick={() => { setShowBookingForm(!showBookingForm); setBookingFormError(""); }}>
                <Plus className="w-4 h-4" />
                Lägg till bokning
              </Button>
            </div>

            {showBookingForm && (
              <Card>
                <CardHeader><p className="font-semibold text-forest-800">Ny bokning</p></CardHeader>
                <CardBody>
                  <form onSubmit={handleAddBooking} className="flex flex-col gap-4">
                    <Input label="Gästens namn" required value={bookingForm.guestName} onChange={(e) => setBookingForm((p) => ({ ...p, guestName: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Incheckning" type="date" required value={bookingForm.checkIn} onChange={(e) => setBookingForm((p) => ({ ...p, checkIn: e.target.value }))} />
                      <Input label="Utcheckning" type="date" required value={bookingForm.checkOut} onChange={(e) => setBookingForm((p) => ({ ...p, checkOut: e.target.value }))} />
                    </div>
                    <Input label="Antal gäster" type="number" min={1} max={20} required value={bookingForm.guests} onChange={(e) => setBookingForm((p) => ({ ...p, guests: Number(e.target.value) }))} />
                    <div>
                      <label className="text-sm font-medium text-forest-800 block mb-1">Status</label>
                      <select
                        value={bookingForm.status}
                        onChange={(e) => setBookingForm((p) => ({ ...p, status: e.target.value }))}
                        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sand-400"
                      >
                        <option value="APPROVED">Godkänd</option>
                        <option value="PENDING">Önskning</option>
                      </select>
                    </div>
                    <Textarea label="Anteckning (synlig för admin)" value={bookingForm.adminNote} onChange={(e) => setBookingForm((p) => ({ ...p, adminNote: e.target.value }))} />
                    {bookingFormError && <p className="text-sm text-red-600">{bookingFormError}</p>}
                    <div className="flex gap-3">
                      <Button type="submit" variant="sand" disabled={bookingFormLoading}>{bookingFormLoading ? "Sparar..." : "Spara bokning"}</Button>
                      <Button type="button" variant="ghost" onClick={() => setShowBookingForm(false)}>Avbryt</Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            )}

            {bookings.length === 0 && (
              <Card><CardBody className="text-center py-12 text-stone-400">Inga bokningar än</CardBody></Card>
            )}
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-forest-800">
                      <CalendarDays className="w-4 h-4 text-sand-500" />
                      {formatDateShort(booking.checkIn)} → {formatDateShort(booking.checkOut)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
                      <span className="font-medium text-stone-700">{booking.user?.name ?? booking.guestName ?? "Okänd gäst"}</span>
                      {booking.user?.email && <span>{booking.user.email}</span>}
                      {!booking.user && booking.guestName && <span className="text-xs bg-stone-100 text-stone-500 rounded px-1.5 py-0.5">Manuell bokning</span>}
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.guests}</span>
                    </div>
                  </div>
                  <Badge variant={statusVariant[booking.status]}>{statusLabel(booking.status, true)}</Badge>
                </CardHeader>
                <CardBody>
                  {booking.message && (
                    <div className="flex gap-2 bg-stone-50 rounded-xl p-3 text-sm text-stone-600 mb-4">
                      <MessageSquare className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      {booking.message}
                    </div>
                  )}

                  {booking.status === "PENDING" && (
                    <div className="flex flex-col gap-3">
                      <Input
                        placeholder="Admin-anteckning (visas för användaren)"
                        value={adminNote[booking.id] ?? ""}
                        onChange={(e) => setAdminNote((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                      />
                      <div className="flex gap-3">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleBookingAction(booking.id, "APPROVED")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check className="w-4 h-4" />
                          Godkänn
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleBookingAction(booking.id, "REJECTED")}
                          className="flex-1"
                        >
                          <X className="w-4 h-4" />
                          Avslå
                        </Button>
                      </div>
                    </div>
                  )}

                  {booking.adminNote && booking.status !== "PENDING" && (
                    <p className="text-sm text-stone-500 italic">Anteckning: {booking.adminNote}</p>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button onClick={() => handleDeleteBooking(booking.id)} className="text-stone-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Tips tab */}
        {tab === "tips" && (
          <div>
            <div className="flex justify-end mb-4">
              <Button variant="sand" size="sm" onClick={() => setShowTipForm(!showTipForm)}>
                <Plus className="w-4 h-4" />
                Lägg till tips
              </Button>
            </div>

            {showTipForm && (
              <Card className="mb-6">
                <CardHeader><p className="font-semibold text-forest-800">Nytt tips</p></CardHeader>
                <CardBody>
                  <form onSubmit={handleAddTip} className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-medium text-forest-800 block mb-1">Kategori</label>
                      <select
                        value={tipForm.category}
                        onChange={(e) => setTipForm((p) => ({ ...p, category: e.target.value }))}
                        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sand-400"
                      >
                        {["RESTAURANT", "EXCURSION", "MARKET", "EVENT", "OTHER"].map((c) => (
                          <option key={c} value={c}>{categoryLabel(c)}</option>
                        ))}
                      </select>
                    </div>
                    <Input label="Titel" required value={tipForm.title} onChange={(e) => setTipForm((p) => ({ ...p, title: e.target.value }))} />
                    <Textarea label="Beskrivning" required value={tipForm.description} onChange={(e) => setTipForm((p) => ({ ...p, description: e.target.value }))} />
                    <Input label="Adress" value={tipForm.address} onChange={(e) => setTipForm((p) => ({ ...p, address: e.target.value }))} />
                    <Input label="Webbplats (URL)" type="url" value={tipForm.website} onChange={(e) => setTipForm((p) => ({ ...p, website: e.target.value }))} />

                    {/* Bilduppladdning */}
                    <div>
                      <label className="text-sm font-medium text-forest-800 block mb-1">Bild</label>
                      <div className="flex flex-col gap-2">
                        <label className={`flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          tipImageLoading
                            ? "bg-stone-100 text-stone-400 pointer-events-none"
                            : "bg-stone-100 hover:bg-stone-200 text-forest-800"
                        }`}>
                          <input type="file" accept="image/*" className="hidden" onChange={handleTipImageUpload} disabled={tipImageLoading} />
                          {tipImageLoading ? "Laddar upp..." : "Välj bild"}
                        </label>
                        {tipImageError && <p className="text-xs text-red-600">{tipImageError}</p>}
                        {tipForm.imageUrl && (
                          <div className="relative w-40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={tipForm.imageUrl} alt="Förhandsgranskning" className="w-40 h-28 object-cover rounded-xl border border-stone-200" />
                            <button
                              type="button"
                              onClick={() => setTipForm((p) => ({ ...p, imageUrl: "" }))}
                              className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-stone-500 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" variant="sand" disabled={tipLoading}>{tipLoading ? "Sparar..." : "Spara tips"}</Button>
                      <Button type="button" variant="ghost" onClick={() => setShowTipForm(false)}>Avbryt</Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            )}

            <div className="flex flex-col gap-3">
              {tips.map((tip) => (
                <Card key={tip.id}>
                  <CardBody className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center shrink-0">
                        {categoryIcons[tip.category]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-forest-800">{tip.title}</p>
                          <Badge variant="category">{categoryLabel(tip.category)}</Badge>
                        </div>
                        <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">{tip.description}</p>
                        {tip.address && <p className="text-xs text-stone-400 mt-1">📍 {tip.address}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTip(tip.id)} className="text-stone-300 hover:text-red-500 transition-colors p-1 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardBody>
                </Card>
              ))}
              {tips.length === 0 && (
                <Card><CardBody className="text-center py-12 text-stone-400">Inga tips tillagda än</CardBody></Card>
              )}
            </div>
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div>
            {/* Lägg till användare */}
            <div className="flex justify-end mb-4">
              <Button variant="sand" size="sm" onClick={() => { setShowUserForm(!showUserForm); setUserFormError(""); }}>
                <Plus className="w-4 h-4" />
                Lägg till användare
              </Button>
            </div>

            {showUserForm && (
              <Card className="mb-6">
                <CardHeader><p className="font-semibold text-forest-800">Ny användare</p></CardHeader>
                <CardBody>
                  <form onSubmit={handleAddUser} className="flex flex-col gap-4">
                    <Input label="Namn" required value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} />
                    <Input label="E-post" type="email" required value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
                    <Input label="Lösenord" type="password" required value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
                    <div>
                      <label className="text-sm font-medium text-forest-800 block mb-1">Roll</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sand-400"
                      >
                        <option value="USER">Användare</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    {userFormError && <p className="text-sm text-red-600">{userFormError}</p>}
                    <div className="flex gap-3">
                      <Button type="submit" variant="sand" disabled={userFormLoading}>{userFormLoading ? "Sparar..." : "Skapa konto"}</Button>
                      <Button type="button" variant="ghost" onClick={() => setShowUserForm(false)}>Avbryt</Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            )}

            <div className="flex flex-col gap-3">
              {appUsers.length === 0 && (
                <Card><CardBody className="text-center py-12 text-stone-400">Inga användare registrerade</CardBody></Card>
              )}
              {appUsers.map((u) => (
                <Card key={u.id}>
                  <CardBody className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 items-start">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${u.role === "ADMIN" ? "bg-forest-100 text-forest-700" : u.approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {u.role === "ADMIN" ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-forest-800">{u.name}</p>
                          <p className="text-sm text-stone-500">{u.email}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {u.role === "ADMIN" && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-forest-100 text-forest-700">Admin</span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {u.approved ? "Godkänd" : "Väntar godkännande"}
                            </span>
                            {u.mfaEnabled && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">MFA aktivt</span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mt-1">Registrerad {new Date(u.createdAt).toLocaleDateString("sv-SE")}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {!u.approved && (
                          <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUserAction(u.id, "approve")}>
                            <UserCheck className="w-4 h-4" />
                            Godkänn
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-stone-500 hover:text-forest-800"
                          onClick={() => { setChangePwId(changePwId === u.id ? null : u.id); setNewPassword(""); }}
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-stone-300 hover:text-red-500 transition-colors p-1"
                          title="Ta bort användare"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Byt lösenord-panel */}
                    {changePwId === u.id && (
                      <div className="flex gap-2 items-center pt-2 border-t border-stone-100">
                        <Input
                          type="password"
                          placeholder="Nytt lösenord (minst 6 tecken)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="sand"
                          disabled={newPassword.length < 6 || pwLoading}
                          onClick={() => handleChangePassword(u.id)}
                        >
                          {pwLoading ? "Sparar..." : "Spara"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setChangePwId(null); setNewPassword(""); }}>
                          Avbryt
                        </Button>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
