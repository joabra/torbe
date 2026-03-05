"use client";
import { useSession } from "next-auth/react";

export function FlightInfo() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <p className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 inline-block">
      ✈️ Gröna prismärken visar billiga direktflyg från Landvetter (GOT) eller Växjö (VXO) till Alicante — klicka för att boka på Kiwi.com.
    </p>
  );
}
