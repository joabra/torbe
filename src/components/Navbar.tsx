"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Menu, X, Leaf, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const publicNavLinks = [
  { href: "/kalender", label: "Kalender" },
  { href: "/aktiviteter", label: "Aktiviteter" },
];

const authNavLinks = [
  { href: "/bilder", label: "Bilder" },
  { href: "/gastbok", label: "Gästbok" },
  { href: "/community", label: "Gemenskap" },
];

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (!session) return;
    fetch("/api/bookings/mine")
      .then((r) => r.ok ? r.json() : [])
      .then((bookings: { status: string }[]) => {
        setPendingCount(bookings.filter((b) => b.status === "PENDING").length);
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/notifications?limit=1")
      .then((r) => (r.ok ? r.json() : { unreadCount: 0 }))
      .then((data: { unreadCount?: number }) => {
        setUnreadNotifications(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, [session]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav className="max-w-6xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/60 px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-forest-800 text-lg">
          <Leaf className="w-5 h-5 text-sand-500" />
          <span>Torbe</span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1">
          {publicNavLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="px-4 py-2 rounded-full text-sm font-medium text-stone-600 hover:text-forest-800 hover:bg-forest-50 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
          {session && authNavLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="px-4 py-2 rounded-full text-sm font-medium text-stone-600 hover:text-forest-800 hover:bg-forest-50 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
          {session && (
            <li>
              <Link
                href="/mina-bokningar"
                className="relative px-4 py-2 rounded-full text-sm font-medium text-stone-600 hover:text-forest-800 hover:bg-forest-50 transition-colors"
              >
                Mina bokningar
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </li>
          )}
          {session && (
            <li>
              <Link
                href="/anlanding"
                className="px-4 py-2 rounded-full text-sm font-medium text-stone-600 hover:text-forest-800 hover:bg-forest-50 transition-colors"
              >
                Ankomst
              </Link>
            </li>
          )}
          {role === "ADMIN" && (
            <li>
              <Link
                href="/admin"
                className="px-4 py-2 rounded-full text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
              >
                Admin
              </Link>
            </li>
          )}
        </ul>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <Link href="/konto#notiser" className="relative text-stone-500 hover:text-forest-800 transition-colors" title="Notiser">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <Link href="/konto" className="text-sm text-stone-500 hover:text-forest-800 transition-colors">
                Hej, {session.user?.name?.split(" ")[0]}
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Logga ut
              </Button>
            </>
          ) : (
            <>
              <Link href="/logga-in">
                <Button variant="ghost" size="sm">Logga in</Button>
              </Link>
            </>
          )}
          <Link href="/boka">
            <Button variant="sand" size="sm">Boka Nu</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
          aria-label="Meny"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden max-w-6xl mx-auto mt-2 bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden transition-all duration-300",
          open ? "max-h-screen opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="px-4 py-4 flex flex-col gap-1">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-forest-50 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {session && authNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-forest-50 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {session && (
            <>
              <Link href="/mina-bokningar" onClick={() => setOpen(false)} className="relative px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-forest-50">
                Mina bokningar
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
              <Link href="/anlanding" onClick={() => setOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-forest-50">
                Ankomst
              </Link>
              <Link href="/konto" onClick={() => setOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-forest-50">
                Kontoinställningar
              </Link>
              <Link href="/konto#notiser" onClick={() => setOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-forest-50">
                Notiser {unreadNotifications > 0 ? `(${unreadNotifications})` : ""}
              </Link>
            </>
          )}
          {role === "ADMIN" && (
            <Link href="/admin" onClick={() => setOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50">
              Admin
            </Link>
          )}
          <div className="border-t border-stone-100 pt-3 mt-2 flex flex-col gap-2">
            {session ? (
              <Button variant="outline" size="sm" onClick={() => { signOut({ callbackUrl: "/" }); setOpen(false); }}>
                Logga ut ({session.user?.name?.split(" ")[0]})
              </Button>
            ) : (
              <Link href="/logga-in" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">Logga in</Button>
              </Link>
            )}
            <Link href="/boka" onClick={() => setOpen(false)}>
              <Button variant="sand" size="sm" className="w-full">Boka Nu</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
