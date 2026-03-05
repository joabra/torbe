"use client";
import { useSession } from "next-auth/react";

export function FlightInfo() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <p className="mt-2 text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 inline-block">
      ↗ <span className="text-green-700 font-medium">Gröna märken</span> = billiga utresor (GOT/VXO → ALC) &nbsp;·&nbsp;
      ↙ <span className="text-sky-700 font-medium">Blå märken</span> = billiga hemresor (ALC → GOT/VXO) — klicka för att söka på Skyscanner.
    </p>
  );
}
