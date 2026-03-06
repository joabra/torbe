"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X, Leaf } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/kalender", label: "Kalender" },
  { href: "/aktiviteter", label: "Aktiviteter" },
  { href: "/bilder", label: "Bilder" },
];

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const role = (session?.user as { role?: string })?.role;

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
          {navLinks.map((link) => (
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
                className="px-4 py-2 rounded-full text-sm font-medium text-stone-600 hover:text-forest-800 hover:bg-forest-50 transition-colors"
              >
                Mina bokningar
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
          {navLinks.map((link) => (
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
              <Link href="/mina-bokningar" onClick={() => setOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-forest-50">
                Mina bokningar
              </Link>
              <Link href="/konto" onClick={() => setOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-stone-700 hover:bg-forest-50">
                Kontoinställningar
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
