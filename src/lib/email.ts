import nodemailer from "nodemailer";

const emailPort = Number(process.env.EMAIL_PORT ?? 587);
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: emailPort,
  secure: emailPort === 465,
  auth:
    process.env.EMAIL_USER
      ? {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        }
      : undefined,
});

const FROM = process.env.EMAIL_FROM ?? "noreply@torbe.se";
const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://torbe.vercel.app";

function wrap(title: string, body: string) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8">
<style>body{font-family:sans-serif;background:#f5f5f0;margin:0;padding:24px}
.card{background:#fff;max-width:560px;margin:0 auto;border-radius:16px;padding:32px;border:1px solid #e7e5e0}
h2{color:#1e3a2f;margin-top:0}p{color:#555;line-height:1.6}
a.btn{display:inline-block;margin-top:16px;padding:12px 24px;background:#8b7355;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}
.footer{text-align:center;font-size:11px;color:#aaa;margin-top:24px}</style>
</head><body><div class="card">
<h2>${title}</h2>${body}
<div class="footer">Torbe Milpalmeras</div></div></body></html>`;
}

async function send(to: string, subject: string, html: string) {
  if (!to || !process.env.EMAIL_HOST) {
    console.warn(`E-post ej skickad till "${to}" – EMAIL_HOST saknas`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`E-post skickad: ${subject} → ${to}`);
  } catch (err) {
    console.error(`E-postfel (till: ${to}, ämne: ${subject}):`, err);
  }
}

/** Admin: ny användare väntar på godkännande */
export async function emailAdminNewUser(user: { name: string; email: string }) {
  if (ADMIN_EMAILS.length === 0) return;
  await send(
    ADMIN_EMAILS.join(","),
    `Ny registrering väntar godkännande – ${user.name}`,
    wrap(
      "Ny användare väntar på godkännande",
      `<p><strong>Namn:</strong> ${user.name}<br>
       <strong>E-post:</strong> ${user.email}</p>
       <p>Logga in på admin-panelen för att godkänna eller avslå kontot.</p>
       <a class="btn" href="${BASE_URL}/admin">Öppna admin-panel</a>`
    )
  );
}

/** Användare: konto väntar på godkännande */
export async function emailUserAwaitingApproval(user: { name: string; email: string }) {
  await send(
    user.email,
    "Ditt konto väntar på godkännande – Torbe",
    wrap(
      `Tack för din registrering, ${user.name}!`,
      `<p>Ditt konto har skapats och väntar nu på godkännande av administratören.</p>
       <p>Du får ett e-postmeddelande så fort ditt konto är godkänt och du kan logga in.</p>`
    )
  );
}

/** Användare: konto godkänt */
export async function emailUserAccountApproved(user: { name: string; email: string }) {
  await send(
    user.email,
    "Ditt konto är godkänt – Torbe",
    wrap(
      `Välkommen, ${user.name}! 🎉`,
      `<p>Ditt konto på Torbe har godkänts av administratören. Du kan nu logga in.</p>
       <a class="btn" href="${BASE_URL}/logga-in">Logga in</a>`
    )
  );
}

/** Admin: ny bokningsbegäran */
export async function emailAdminNewBooking(
  booking: { checkIn: Date; checkOut: Date; guests: number; message?: string | null },
  user: { name: string; email: string }
) {
  if (ADMIN_EMAILS.length === 0) return;
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  await send(
    ADMIN_EMAILS.join(","),
    `Ny bokningsbegäran: ${fmt(booking.checkIn)} – ${fmt(booking.checkOut)}`,
    wrap(
      "Ny bokningsbegäran",
      `<p><strong>Gäst:</strong> ${user.name} (${user.email})<br>
       <strong>Incheckning:</strong> ${fmt(booking.checkIn)}<br>
       <strong>Utcheckning:</strong> ${fmt(booking.checkOut)}<br>
       <strong>Antal gäster:</strong> ${booking.guests}</p>
       ${booking.message ? `<p><strong>Meddelande:</strong><br>${booking.message}</p>` : ""}
       <a class="btn" href="${BASE_URL}/admin">Hantera bokning</a>`
    )
  );
}

/** Användare: bokningsstatus ändrad */
export async function emailUserBookingStatus(
  booking: {
    status: "APPROVED" | "REJECTED";
    checkIn: Date;
    checkOut: Date;
    adminNote?: string | null;
  },
  user: { name: string; email: string }
) {
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  const approved = booking.status === "APPROVED";
  await send(
    user.email,
    approved ? "Din bokning är godkänd – Torbe" : "Din bokningsbegäran har avslagits – Torbe",
    wrap(
      approved ? "Din bokning är godkänd! 🎉" : "Din bokningsbegäran har avslagits",
      `<p><strong>Incheckning:</strong> ${fmt(booking.checkIn)}<br>
       <strong>Utcheckning:</strong> ${fmt(booking.checkOut)}</p>
       ${booking.adminNote ? `<p><strong>Meddelande från admin:</strong><br>${booking.adminNote}</p>` : ""}
       ${approved ? `<a class="btn" href="${BASE_URL}/mina-bokningar">Se dina bokningar</a>` : ""}`
    )
  );
}
