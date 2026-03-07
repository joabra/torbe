import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailUserBookingReminder } from "@/lib/email";
import { logCronError, logCronSuccess } from "@/lib/cron-log";

// This route is called by Vercel Cron — protected by CRON_SECRET
export async function GET(req: NextRequest) {
  const startedAt = new Date();
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = req.headers.get("x-cron-source") === "manual" ? "MANUAL" : "SCHEDULED";

  try {
    const now = new Date();
    const reminderConfigs = [
      { days: 30 as const, type: "DAYS_30" as const },
      { days: 14 as const, type: "DAYS_14" as const },
      { days: 7 as const, type: "DAYS_7" as const },
      { days: 1 as const, type: "DAYS_1" as const },
    ];

    const apartmentInfo = await prisma.apartmentInfo.findFirst({ select: { arrivalInfo: true } });
    const arrivalInfo = (apartmentInfo?.arrivalInfo ?? {}) as {
      wifiName?: string;
      checkInInstructions?: string;
      houseRules?: string;
    };

    let sent = 0;
    const sentByType: Record<string, number> = { DAYS_30: 0, DAYS_14: 0, DAYS_7: 0, DAYS_1: 0 };

    for (const cfg of reminderConfigs) {
      const target = new Date(now.getTime() + cfg.days * 24 * 60 * 60 * 1000);
      const start = new Date(target.getTime() - 12 * 60 * 60 * 1000);
      const end = new Date(target.getTime() + 12 * 60 * 60 * 1000);

      const bookings = await prisma.booking.findMany({
        where: {
          status: "APPROVED",
          checkIn: { gte: start, lte: end },
          userId: { not: null },
        },
        include: {
          user: { select: { name: true, email: true } },
          reminderLogs: { where: { type: cfg.type }, select: { id: true } },
          checklistItems: { select: { completed: true } },
        },
      });

      for (const booking of bookings) {
        if (!booking.user?.email) continue;
        if (booking.reminderLogs.length > 0) continue;

        const checklistTotal = booking.checklistItems.length;
        const checklistCompleted = booking.checklistItems.filter((x) => x.completed).length;

        await emailUserBookingReminder(
          {
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: booking.guests,
          },
          { name: booking.user.name, email: booking.user.email },
          cfg.days,
          {
            checklistCompleted,
            checklistTotal,
            arrival: {
              wifiName: arrivalInfo.wifiName,
              checkInInstructions: arrivalInfo.checkInInstructions,
              houseRules: arrivalInfo.houseRules,
            },
          }
        );

        await prisma.reminderLog.create({
          data: {
            bookingId: booking.id,
            type: cfg.type,
          },
        });

        sent++;
        sentByType[cfg.type] = (sentByType[cfg.type] ?? 0) + 1;
      }
    }

    const result = { ok: true, remindersSent: sent, sentByType };
    await logCronSuccess("REMINDERS", source, startedAt, result);
    return NextResponse.json(result);
  } catch (error) {
    await logCronError("REMINDERS", source, startedAt, error);
    return NextResponse.json({ error: "Reminder-jobb misslyckades" }, { status: 500 });
  }
}
