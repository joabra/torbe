import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalBookings,
    approvedBookings,
    pendingBookings,
    rejectedBookings,
    totalUsers,
    pendingUsers,
    activeWaitlist,
    activeFlightWatches,
    remindersSent24h,
    flightWatchNotifications24h,
    recentReminderEvents,
    recentFlightWatchHits,
    recentCronRuns,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "APPROVED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "REJECTED" } }),
    prisma.user.count(),
    prisma.user.count({ where: { approved: false } }),
    prisma.waitlist.count({ where: { notified: false } }),
    prisma.flightWatch.count({ where: { active: true } }),
    prisma.reminderLog.count({ where: { sentAt: { gte: since24h } } }),
    prisma.flightWatch.count({ where: { lastNotifiedAt: { gte: since24h } } }),
    prisma.reminderLog.findMany({
      take: 8,
      orderBy: { sentAt: "desc" },
      include: {
        booking: {
          select: {
            checkIn: true,
            checkOut: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.flightWatch.findMany({
      take: 8,
      where: { lastNotifiedAt: { not: null } },
      orderBy: { lastNotifiedAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.cronJobRun.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    summary: {
      totalBookings,
      approvedBookings,
      pendingBookings,
      rejectedBookings,
      totalUsers,
      pendingUsers,
      activeWaitlist,
      activeFlightWatches,
    },
    notifications: {
      remindersSent24h,
      flightWatchNotifications24h,
    },
    recentReminderEvents: recentReminderEvents.map((e) => ({
      id: e.id,
      type: e.type,
      sentAt: e.sentAt,
      checkIn: e.booking.checkIn,
      checkOut: e.booking.checkOut,
      userName: e.booking.user?.name ?? null,
      userEmail: e.booking.user?.email ?? null,
    })),
    recentFlightWatchHits: recentFlightWatchHits.map((w) => ({
      id: w.id,
      origin: w.origin,
      destination: w.destination,
      direction: w.direction,
      maxPrice: w.maxPrice,
      lastNotifiedAt: w.lastNotifiedAt,
      userName: w.user.name,
      userEmail: w.user.email,
    })),
    recentCronRuns: recentCronRuns.map((r) => ({
      id: r.id,
      job: r.job,
      source: r.source,
      status: r.status,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      durationMs: r.durationMs,
      result: r.result,
      error: r.error,
      createdAt: r.createdAt,
    })),
  });
}
