import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Torbe — Familjens plats i solen",
  description: "Boka familjens lägenhet i Spanien. Se lediga datum, aktiviteter och bildgalleri.",
  openGraph: {
    title: "Torbe — Familjens plats i solen",
    description: "Boka familjens lägenhet i Spanien. Se lediga datum, aktiviteter och bildgalleri.",
    url: "https://torbe.vercel.app",
    siteName: "Torbe",
    images: [
      {
        url: "/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Familjens lägenhet i Mil Palmeras, Costa Blanca",
      },
    ],
    locale: "sv_SE",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <SpeedInsights />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
