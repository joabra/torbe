import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Väntar på godkännande",
    APPROVED: "Godkänd",
    REJECTED: "Avslåd",
  };
  return labels[status] ?? status;
}

export function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    RESTAURANT: "Restaurang",
    EXCURSION: "Utflykt",
    MARKET: "Marknad",
    EVENT: "Event",
    OTHER: "Övrigt",
  };
  return labels[cat] ?? cat;
}
