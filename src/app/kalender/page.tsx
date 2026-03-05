import { BookingCalendar } from "@/components/BookingCalendar";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FlightInfo } from "@/components/FlightInfo";

export const metadata = {
  title: "Kalender — Torbe",
  description: "Se när lägenheten är ledig eller bokad.",
};

export default function KalenderPage() {
  return (
    <div className="pt-28 pb-20 px-6 bg-stone-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Tillgänglighet</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Bokningskalender</h1>
          <p className="mt-3 text-stone-500">
            Röda datum är bokade. Lediga datum kan du boka nedan.
          </p>
          <FlightInfo />
        </div>

        <BookingCalendar />

        <div className="mt-8 text-center">
          <Link href="/boka">
            <Button variant="sand" size="lg">Boka ett ledigt datum</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
