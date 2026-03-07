import Link from "next/link";
import { Wifi, PawPrint, Key, Star, MapPin, ChevronDown, CalendarDays, Trophy, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HeroBookingWidget } from "@/components/HeroBookingWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const features = [
  { icon: Wifi, label: "Wi-Fi 100 Mbps" },
  { icon: Key, label: "Self Check-in" },
  { icon: PawPrint, label: "Husdjursvänlig" },
];

async function getNextBookingInfo() {
  const now = new Date();
  const next = await prisma.booking.findFirst({
    where: { status: "APPROVED", checkIn: { gte: now } },
    orderBy: { checkIn: "asc" },
  });
  if (!next) return null;
  const diffMs = next.checkIn.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { daysUntil: diffDays, checkIn: next.checkIn, checkOut: next.checkOut };
}

async function getApartmentStats() {
  const info = await prisma.apartmentInfo.findFirst();
  if (!info) return { maxGuests: 8, bedrooms: 3, bathrooms: 2, distanceToBeach: "50 m", description: "Vår lägenhet i Mil Palmeras, Pilar de la Horadada — en lugn kustort på Costa Blanca med Blue Flag-strand, kristallklart vatten och 300 soldagar om året. Nära Torre de la Horadada, Torrevieja och Mar Menor. Perfekt för familjeträffar och avkoppling." };
  const features = info.features as Record<string, string | number>;
  return {
    maxGuests: info.maxGuests,
    bedrooms: Number(features.bedrooms ?? 3),
    bathrooms: Number(features.bathrooms ?? 2),
    distanceToBeach: String(features.distanceToBeach ?? "50 m"),
    description: info.description,
  };
}

type ActivityItem = {
  id: string;
  type: "tip" | "photo" | "guestbook";
  title: string;
  subtitle: string;
  href: string;
  createdAt: Date;
};

async function getRecentActivity(): Promise<ActivityItem[]> {
  const [tips, photos, entries] = await Promise.all([
    prisma.tip.findMany({
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.visitPhoto.findMany({
      select: { id: true, caption: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.guestbookEntry.findMany({
      select: { id: true, content: true, createdAt: true, author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const activity: ActivityItem[] = [
    ...tips.map((t) => ({
      id: `tip-${t.id}`,
      type: "tip" as const,
      title: "Nytt tips",
      subtitle: t.title,
      href: "/aktiviteter",
      createdAt: t.createdAt,
    })),
    ...photos.map((p) => ({
      id: `photo-${p.id}`,
      type: "photo" as const,
      title: "Ny bild uppladdad",
      subtitle: p.caption?.trim() || `Av ${p.user?.name ?? "familjemedlem"}`,
      href: "/bilder",
      createdAt: p.createdAt,
    })),
    ...entries.map((e) => ({
      id: `guestbook-${e.id}`,
      type: "guestbook" as const,
      title: "Nytt i gästboken",
      subtitle: `${e.author?.name ?? "Anonym"}: ${e.content.slice(0, 60)}${e.content.length > 60 ? "..." : ""}`,
      href: "/gastbok",
      createdAt: e.createdAt,
    })),
  ];

  return activity.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 6);
}

async function getLeaderboardHighlights() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [tipVotes, users] = await Promise.all([
    prisma.tipVote.groupBy({
      by: ["tipId"],
      where: { createdAt: { gte: monthStart } },
      _count: { tipId: true },
      orderBy: { _count: { tipId: "desc" } },
      take: 3,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { tips: { some: { createdAt: { gte: monthStart } } } },
          { visitPhotos: { some: { createdAt: { gte: monthStart } } } },
          { guestbookEntries: { some: { createdAt: { gte: monthStart } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        tips: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
        visitPhotos: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
        guestbookEntries: { where: { createdAt: { gte: monthStart } }, select: { id: true } },
      },
    }),
  ]);

  const tips = tipVotes.length
    ? await prisma.tip.findMany({
        where: { id: { in: tipVotes.map((v) => v.tipId) } },
        select: { id: true, title: true },
      })
    : [];

  const tipMap = new Map(tips.map((t) => [t.id, t]));
  const topTips = tipVotes
    .map((v) => {
      const tip = tipMap.get(v.tipId);
      if (!tip) return null;
      return { id: tip.id, title: tip.title, votes: v._count.tipId };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const topContributors = users
    .map((u) => {
      const total = u.tips.length + u.visitPhotos.length + u.guestbookEntries.length;
      return { id: u.id, name: u.name, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return { topTips, topContributors };
}

export default async function HomePage() {
  const [nextBooking, apt, activity, leaderboard] = await Promise.all([
    getNextBookingInfo(),
    getApartmentStats(),
    getRecentActivity(),
    getLeaderboardHighlights(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-screen min-h-[600px] flex flex-col overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />

        {/* Hero content */}
        <div className="relative flex-1 flex flex-col justify-center items-center text-center px-6 pt-28">
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight drop-shadow-lg max-w-3xl">
            Er plats{" "}
            <span className="text-sand-400">i solen</span>
          </h1>
          <p className="mt-6 text-white/85 text-lg md:text-xl max-w-xl leading-relaxed drop-shadow">
            Familjens lägenhet i Spanien — för avkoppling, äventyr och minnen för livet.
          </p>

          {/* Feature badges + weather */}
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            {features.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-5 py-2.5 text-white text-sm font-medium"
              >
                <Icon className="w-4 h-4 text-sand-400" />
                {label}
              </div>
            ))}
            <WeatherWidget />
          </div>

          {/* Days until next booking */}
          {nextBooking && (
            <div className="mt-4 flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-white text-sm">
              <CalendarDays className="w-4 h-4 text-sand-400" />
              {nextBooking.daysUntil === 0
                ? "Nästa bokning börjar idag!"
                : nextBooking.daysUntil === 1
                ? "Nästa bokning börjar imorgon"
                : `${nextBooking.daysUntil} dagar till nästa bokning`}
            </div>
          )}

          {/* Rating badge */}
          <div className="absolute right-8 bottom-48 md:right-16 text-right hidden md:block">
            <div className="flex items-center justify-end gap-1.5">
              <Star className="w-5 h-5 fill-sand-400 text-sand-400" />
              <span className="text-white text-3xl font-bold">4.9</span>
            </div>
            <p className="text-white/70 text-sm">från familjen</p>
          </div>

          {/* Location pin */}
          <div className="absolute left-8 bottom-48 md:left-16 hidden md:block">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg flex flex-col items-center gap-1">
              <MapPin className="w-6 h-6 text-forest-700" />
              <span className="text-[10px] text-stone-500 font-semibold">Mil Palmeras</span>
              <span className="text-[9px] text-stone-400">Costa Blanca, Alicante</span>
            </div>
          </div>
        </div>

        {/* Booking widget */}
        <div className="relative pb-10 px-4 flex justify-center">
          <HeroBookingWidget />
        </div>

        {/* Scroll cue */}
        <a
          href="#about"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 hover:text-white transition-colors"
        >
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </a>
      </section>

      {/* About the apartment */}
      <section id="about" className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Lägenheten</span>
            <h2 className="mt-3 text-4xl font-bold text-forest-900 leading-tight">
              Din perfekta bas<br />på solkusten
            </h2>
            <p className="mt-5 text-stone-500 leading-relaxed">
              {apt.description}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: "Sovrum", value: String(apt.bedrooms) },
                { label: "Badrum", value: String(apt.bathrooms) },
                { label: "Max gäster", value: String(apt.maxGuests) },
                { label: "Till stranden", value: apt.distanceToBeach },
              ].map((stat) => (
                <div key={stat.label} className="bg-forest-50 rounded-2xl p-4 border border-forest-100">
                  <p className="text-2xl font-bold text-forest-800">{stat.value}</p>
                  <p className="text-sm text-stone-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/boka">
                <Button variant="sand" size="lg">Boka din vistelse</Button>
              </Link>
            </div>
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { src: "/tips/beach.jpg", alt: "Stranden vid Mil Palmeras" },
              { src: "/tips/restaurant.jpg", alt: "Färsk skaldjur på Costa Blanca" },
              { src: "/tips/saltlake.jpg", alt: "Torreviejas rosa saltsjö" },
              { src: "/tips/market.jpg", alt: "Lokal marknad" },
            ].map((img, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl overflow-hidden bg-forest-50 border border-forest-100 hover:scale-[1.02] transition-transform"
              >
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="bg-forest-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 mb-10">
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <div className="flex items-center gap-2 text-forest-800 font-semibold mb-3">
                <Trophy className="w-4 h-4" />
                Månadens mest gillade tips
              </div>
              {leaderboard.topTips.length === 0 ? (
                <p className="text-sm text-stone-500">Inga röster ännu denna månad.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.topTips.map((tip, index) => (
                    <div key={tip.id} className="text-sm text-stone-700 flex items-center justify-between gap-2">
                      <span>#{index + 1} {tip.title}</span>
                      <span className="text-xs font-semibold text-forest-700">{tip.votes} gillningar</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <div className="flex items-center gap-2 text-forest-800 font-semibold mb-3">
                <BarChart3 className="w-4 h-4" />
                Mest aktiva familjemedlemmar
              </div>
              {leaderboard.topContributors.length === 0 ? (
                <p className="text-sm text-stone-500">Ingen aktivitet ännu denna månad.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.topContributors.map((person, index) => (
                    <div key={person.id} className="text-sm text-stone-700 flex items-center justify-between gap-2">
                      <span>#{index + 1} {person.name}</span>
                      <span className="text-xs font-semibold text-forest-700">{person.total} bidrag</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/community" className="inline-block mt-4 text-sm text-forest-700 hover:underline">
                Gå till Gemenskap →
              </Link>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-forest-900 text-center mb-12">Allt du behöver</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { href: "/kalender", title: "Tillgänglighet", desc: "Se när lägenheten är ledig eller bokad av familjen.", icon: "📅" },
              { href: "/aktiviteter", title: "Aktiviteter & Tips", desc: "Restauranger, utflykter, marknader och event i närheten.", icon: "🌊" },
              { href: "/bilder", title: "Bildgalleri", desc: "Se bilder från familjens vistelser via Instagram.", icon: "📸" },
              { href: "/gastbok", title: "Gästbok", desc: "Läs och skriv minnen från familjens vistelser.", icon: "📖" },
              { href: "/community", title: "Gemenskap", desc: "Topplistor, omröstningar och global fråga-admin-tråd.", icon: "🏆" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100 hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">{item.icon}</div>
                <h3 className="font-bold text-forest-800 text-lg mb-2">{item.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Activity feed */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <h2 className="text-3xl font-bold text-forest-900">Senast nytt</h2>
            <p className="text-sm text-stone-500">Nya tips, bilder och hälsningar från familjen</p>
          </div>

          {activity.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-6 py-8 text-stone-500">
              Inga uppdateringar ännu.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activity.map((item) => (
                <Link key={item.id} href={item.href} className="rounded-2xl border border-stone-200 bg-white px-5 py-4 hover:border-forest-200 hover:bg-forest-50/30 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-forest-800">
                      {item.type === "tip" ? "💡" : item.type === "photo" ? "📸" : "📖"} {item.title}
                    </p>
                    <span className="text-xs text-stone-400">{new Date(item.createdAt).toLocaleDateString("sv-SE")}</span>
                  </div>
                  <p className="text-sm text-stone-600 mt-1 line-clamp-2">{item.subtitle}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
