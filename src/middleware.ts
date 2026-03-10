import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;

  // Not authenticated — block access
  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/logga-in", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but not ADMIN trying to access /admin
  if (pathname.startsWith("/admin")) {
    const role = (req.auth.user as { role?: string })?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protected pages
    "/admin/:path*",
    "/aktiviteter/:path*",
    "/anlanding/:path*",
    "/bilder/:path*",
    "/boka/:path*",
    "/community/:path*",
    "/gastbok/:path*",
    "/kalender/:path*",
    "/konto/:path*",
    "/mina-bokningar/:path*",

    // Protected API routes
    // Note: /api/cron/* uses CRON_SECRET, excluded
    // Note: /api/auth/* is NextAuth, excluded
    // Note: /api/register/* is public registration, excluded
    // Note: /api/instagram is used by public home page widget, excluded
    // Note: /api/bookings/calendar/* uses token auth, excluded
    "/api/account/:path*",
    "/api/admin/:path*",
    "/api/community/:path*",
    "/api/flights/:path*",
    "/api/gastbok/:path*",
    "/api/instagram-links/:path*",
    "/api/notifications/:path*",
    "/api/photos/:path*",
    "/api/tips/:path*",
    "/api/tips",
    "/api/upload/:path*",
    "/api/waitlist/:path*",
    "/api/bookings/mine/:path*",
    "/api/bookings/mine",
  ],
};
