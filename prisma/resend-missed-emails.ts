/**
 * Skickar om missade e-postmeddelanden till väntande användare och bokningar.
 * Kör: npx tsx prisma/resend-missed-emails.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  emailAdminNewUser,
  emailUserAwaitingApproval,
  emailAdminNewBooking,
} from "../src/lib/email";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Användare som väntar på godkännande (approved = false, ej admin)
  const pendingUsers = await prisma.user.findMany({
    where: { approved: false, role: "USER" },
    select: { name: true, email: true },
  });

  console.log(`\nHittade ${pendingUsers.length} användare som väntar på godkännande`);
  for (const user of pendingUsers) {
    console.log(`  → ${user.name} (${user.email})`);
    await emailAdminNewUser(user);
    await emailUserAwaitingApproval(user);
    console.log(`  ✅ Mail skickat för ${user.email}`);
  }

  // 2. Bokningar som väntar på svar
  const pendingBookings = await prisma.booking.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, email: true } } },
  });

  console.log(`\nHittade ${pendingBookings.length} väntande bokningar`);
  for (const [i, booking] of pendingBookings.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));
    const user = booking.user
      ? { name: booking.user.name, email: booking.user.email }
      : { name: booking.guestName ?? "Gäst", email: "" };

    console.log(
      `  → ${booking.checkIn.toLocaleDateString("sv-SE")} – ${booking.checkOut.toLocaleDateString("sv-SE")} (${user.name})`
    );

    if (user.email) {
      await emailAdminNewBooking(
        {
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          message: booking.message,
        },
        user
      );
      console.log(`  ✅ Admin notifierad för bokning ${booking.id}`);
    } else {
      console.log(`  ⚠️  Ingen e-post för bokning ${booking.id} (gästbokning utan e-post)`);
    }
  }

  console.log("\nKlart!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
