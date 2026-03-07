import { prisma } from "@/lib/prisma";
import { emailUserWaitlistMatch } from "@/lib/email";

type WaitlistCandidate = {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  message: string | null;
  user: { name: string; email: string };
};

const prismaWithWaitlist = prisma as typeof prisma & {
  waitlist: {
    findMany: (args: unknown) => Promise<WaitlistCandidate[]>;
    update: (args: unknown) => Promise<unknown>;
  };
};

function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Finds relevant waitlist entries for a newly opened date interval and sends a one-time email.
 */
export async function notifyWaitlistForOpenedDates(
  openedCheckIn: Date,
  openedCheckOut: Date
) {
  const candidates = await prismaWithWaitlist.waitlist.findMany({
    where: { notified: false },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const matches = candidates.filter((entry: WaitlistCandidate) =>
    overlaps(entry.checkIn, entry.checkOut, openedCheckIn, openedCheckOut)
  );

  if (matches.length === 0) return 0;

  await Promise.all(
    matches.map(async (entry: WaitlistCandidate) => {
      await emailUserWaitlistMatch(
        {
          checkIn: entry.checkIn,
          checkOut: entry.checkOut,
          guests: entry.guests,
          message: entry.message,
        },
        {
          name: entry.user.name,
          email: entry.user.email,
        }
      );

      await prismaWithWaitlist.waitlist.update({
        where: { id: entry.id },
        data: { notified: true },
      });
    })
  );

  return matches.length;
}
