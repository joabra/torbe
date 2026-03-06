import Link from "next/link";
import { Wifi, PawPrint, Key, Star, MapPin, ChevronDown, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HeroBookingWidget } from "@/components/HeroBookingWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { prisma } from "@/lib/prisma";

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

export default async function HomePage() {
  const [nextBooking, apt] = await Promise.all([getNextBookingInfo(), getApartmentStats()]);

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
          <h2 className="text-3xl font-bold text-forest-900 text-center mb-12">Allt du behöver</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { href: "/kalender", title: "Tillgänglighet", desc: "Se när lägenheten är ledig eller bokad av familjen.", icon: "📅" },
              { href: "/aktiviteter", title: "Aktiviteter & Tips", desc: "Restauranger, utflykter, marknader och event i närheten.", icon: "🌊" },
              { href: "/bilder", title: "Bildgalleri", desc: "Se bilder från familjens vistelser via Instagram.", icon: "📸" },
              { href: "/gastbok", title: "Gästbok", desc: "Läs och skriv minnen från familjens vistelser.", icon: "📖" },
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
    </div>
  );
}
