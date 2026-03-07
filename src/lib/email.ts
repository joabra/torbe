import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM = process.env.EMAIL_FROM ?? "noreply@torbe.se";
const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://torbe.vercel.app";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
  const resend = getResendClient();
  if (!to || !resend) {
    console.warn(`E-post ej skickad till "${to}" – RESEND_API_KEY saknas`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw error;
    console.log(`E-post skickad: ${subject} → ${to}`);
  } catch (err) {
    console.error(`E-postfel (till: ${to}, ämne: ${subject}):`, err);
  }
}

async function sendToAdmins(subject: string, html: string) {
  if (ADMIN_EMAILS.length === 0) {
    console.warn("Inga admin-adresser konfigurerade (ADMIN_EMAIL saknas)");
    return;
  }
  await Promise.all(ADMIN_EMAILS.map((to) => send(to, subject, html)));
}

/** Admin: ny användare väntar på godkännande */
export async function emailAdminNewUser(user: { name: string; email: string }) {
  const name = escapeHtml(user.name);
  const email = escapeHtml(user.email);
  await sendToAdmins(
    `Ny registrering väntar godkännande – ${user.name}`,
    wrap(
      "Ny användare väntar på godkännande",
      `<p><strong>Namn:</strong> ${name}<br>
       <strong>E-post:</strong> ${email}</p>
       <p>Logga in på admin-panelen för att godkänna eller avslå kontot.</p>
       <a class="btn" href="${BASE_URL}/admin">Öppna admin-panel</a>`
    )
  );
}

/** Användare: konto väntar på godkännande */
export async function emailUserAwaitingApproval(user: { name: string; email: string }) {
  const name = escapeHtml(user.name);
  await send(
    user.email,
    "Ditt konto väntar på godkännande – Torbe",
    wrap(
      `Tack för din registrering, ${name}!`,
      `<p>Ditt konto har skapats och väntar nu på godkännande av administratören.</p>
       <p>Du får ett e-postmeddelande så fort ditt konto är godkänt och du kan logga in.</p>`
    )
  );
}

/** Användare: konto godkänt */
export async function emailUserAccountApproved(user: { name: string; email: string }) {
  const name = escapeHtml(user.name);
  await send(
    user.email,
    "Ditt konto är godkänt – Torbe",
    wrap(
      `Välkommen, ${name}! 🎉`,
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
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  const name = escapeHtml(user.name);
  const email = escapeHtml(user.email);
  const message = booking.message ? escapeHtml(booking.message) : null;
  await sendToAdmins(
    `Ny bokningsbegäran: ${fmt(booking.checkIn)} – ${fmt(booking.checkOut)}`,
    wrap(
      "Ny bokningsbegäran",
      `<p><strong>Gäst:</strong> ${name} (${email})<br>
       <strong>Incheckning:</strong> ${fmt(booking.checkIn)}<br>
       <strong>Utcheckning:</strong> ${fmt(booking.checkOut)}<br>
       <strong>Antal gäster:</strong> ${booking.guests}</p>
       ${message ? `<p><strong>Meddelande:</strong><br>${message}</p>` : ""}
       <a class="btn" href="${BASE_URL}/admin">Hantera bokning</a>`
    )
  );
}

/** Admin: manuell bokning skapad av admin (bekräftelse till admin) */
export async function emailAdminManualBookingCreated(
  booking: { checkIn: Date; checkOut: Date; guests: number; guestName: string; adminNote?: string | null }
) {
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  const guestName = escapeHtml(booking.guestName);
  const adminNote = booking.adminNote ? escapeHtml(booking.adminNote) : null;
  await sendToAdmins(
    `Manuell bokning skapad: ${guestName} – ${fmt(booking.checkIn)}`,
    wrap(
      "Manuell bokning skapad",
      `<p><strong>Gäst:</strong> ${guestName}<br>
       <strong>Incheckning:</strong> ${fmt(booking.checkIn)}<br>
       <strong>Utcheckning:</strong> ${fmt(booking.checkOut)}<br>
       <strong>Antal gäster:</strong> ${booking.guests}</p>
       ${adminNote ? `<p><strong>Anteckning:</strong><br>${adminNote}</p>` : ""}
       <a class="btn" href="${BASE_URL}/admin">Öppna admin-panel</a>`
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
  const adminNote = booking.adminNote ? escapeHtml(booking.adminNote) : null;
  await send(
    user.email,
    approved ? "Din bokning är godkänd – Torbe" : "Din bokningsbegäran har avslagits – Torbe",
    wrap(
      approved ? "Din bokning är godkänd! 🎉" : "Din bokningsbegäran har avslagits",
      `<p><strong>Incheckning:</strong> ${fmt(booking.checkIn)}<br>
       <strong>Utcheckning:</strong> ${fmt(booking.checkOut)}</p>
       ${adminNote ? `<p><strong>Meddelande från admin:</strong><br>${adminNote}</p>` : ""}
       ${approved ? `<a class="btn" href="${BASE_URL}/mina-bokningar">Se dina bokningar</a>` : ""}`
    )
  );
}

/** Användare: påminnelse inför incheckning */
export async function emailUserBookingReminder(
  booking: { checkIn: Date; checkOut: Date; guests: number },
  user: { name: string; email: string },
  daysLeft: 30 | 14 | 7 | 1,
  context?: {
    checklistCompleted?: number;
    checklistTotal?: number;
    arrival?: {
      wifiName?: string;
      checkInInstructions?: string;
      houseRules?: string;
    };
  }
) {
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  const name = escapeHtml(user.name);
  const preheader =
    daysLeft === 30
      ? "Nu är det en månad kvar till resan"
      : daysLeft === 14
      ? "Nu är det två veckor kvar"
      : daysLeft === 7
      ? "Nu är det en vecka kvar"
      : "Nu är det dags i morgon";

  const weatherUrl = `https://www.yr.no/en/forecast/daily-table/2-2513227/Spain/Valencia/Pilar%20de%20la%20Horadada/Mil%20Palmeras?i=0`;
  const flightUrl = `${BASE_URL}/kalender`;
  const checklistUrl = `${BASE_URL}/mina-bokningar`;
  const arrivalUrl = `${BASE_URL}/anlanding`;

  const checklistCompleted = context?.checklistCompleted ?? 0;
  const checklistTotal = context?.checklistTotal ?? 0;
  const checklistText = checklistTotal > 0
    ? `${checklistCompleted}/${checklistTotal} punkter avklarade`
    : "Ingen checklista skapad ännu";

  const arrivalBits = context?.arrival;
  const arrivalSummary = [
    arrivalBits?.wifiName ? `<li><strong>WiFi:</strong> ${escapeHtml(arrivalBits.wifiName)}</li>` : "",
    arrivalBits?.checkInInstructions ? `<li><strong>Incheckning:</strong> ${escapeHtml(arrivalBits.checkInInstructions).slice(0, 140)}${arrivalBits.checkInInstructions.length > 140 ? "..." : ""}</li>` : "",
    arrivalBits?.houseRules ? `<li><strong>Husregler:</strong> ${escapeHtml(arrivalBits.houseRules).slice(0, 140)}${arrivalBits.houseRules.length > 140 ? "..." : ""}</li>` : "",
  ].filter(Boolean).join("");

  await send(
    user.email,
    `Påminnelse: Din vistelse börjar om ${daysLeft} ${daysLeft === 1 ? "dag" : "dagar"} – Torbe`,
    wrap(
      `Din vistelse närmar sig, ${name}! 🌴`,
      `<p>${preheader}. Det är <strong>${daysLeft} ${daysLeft === 1 ? "dag" : "dagar"} kvar</strong> till din vistelse i Mil Palmeras.</p>
       <p><strong>Incheckning:</strong> ${fmt(booking.checkIn)}<br>
       <strong>Utcheckning:</strong> ${fmt(booking.checkOut)}<br>
       <strong>Antal gäster:</strong> ${booking.guests}</p>
       <p><strong>Checklista-status:</strong> ${checklistText}</p>
       ${arrivalSummary ? `<p><strong>Snabbt om ankomst:</strong></p><ul>${arrivalSummary}</ul>` : ""}
       <p>Planeringstips inför resan:</p>
       <ul>
         <li><a href="${weatherUrl}">Kolla väderprognos för Mil Palmeras</a></li>
         <li><a href="${flightUrl}">Se flygtips / prisvakter</a></li>
         <li><a href="${arrivalUrl}">Läs ankomstinfo</a></li>
         <li><a href="${checklistUrl}">Bocka av checklistan</a></li>
       </ul>
       <a class="btn" href="${checklistUrl}">Öppna mina bokningar</a>`
    )
  );
}

/** Användare: prisvakt träff */
export async function emailUserFlightWatchMatch(
  watch: {
    origin: string;
    destination: string;
    maxPrice: number;
    foundPrice: number;
    date: string;
    direction: "OUTBOUND" | "RETURN";
  },
  user: { name: string; email: string }
) {
  const name = escapeHtml(user.name);
  const dir = watch.direction === "OUTBOUND" ? "Utresa" : "Hemresa";
  await send(
    user.email,
    `Prisvakt: flyg för ${watch.foundPrice} kr (${watch.origin}→${watch.destination})`,
    wrap(
      `Prisvakt-träff, ${name}! ✈️`,
      `<p>Vi hittade ett pris som matchar din bevakning.</p>
       <p><strong>${dir}:</strong> ${watch.origin} → ${watch.destination}<br>
       <strong>Datum:</strong> ${watch.date}<br>
       <strong>Hittat pris:</strong> ${watch.foundPrice} kr<br>
       <strong>Din gräns:</strong> ${watch.maxPrice} kr</p>
       <a class="btn" href="${BASE_URL}/kalender">Se flyg i kalendern</a>`
    )
  );
}

/** Användare: väntelista matchar lediga datum */
export async function emailUserWaitlistMatch(
  waitlist: {
    checkIn: Date;
    checkOut: Date;
    guests: number;
    message?: string | null;
  },
  user: { name: string; email: string }
) {
  const fmt = (d: Date) => d.toLocaleDateString("sv-SE");
  const name = escapeHtml(user.name);
  const message = waitlist.message ? escapeHtml(waitlist.message) : null;

  await send(
    user.email,
    "Lediga datum kan passa din väntelista – Torbe",
    wrap(
      `Hej ${name}, vi har goda nyheter!`,
      `<p>Det har blivit ledigt för datum som matchar din väntelista.</p>
       <p><strong>Önskade datum:</strong> ${fmt(waitlist.checkIn)} – ${fmt(waitlist.checkOut)}<br>
       <strong>Antal gäster:</strong> ${waitlist.guests}</p>
       ${message ? `<p><strong>Ditt meddelande:</strong><br>${message}</p>` : ""}
       <p>Tips: skicka en bokningsförfrågan så snart som möjligt.</p>
       <a class="btn" href="${BASE_URL}/boka?checkIn=${waitlist.checkIn.toISOString().split("T")[0]}&checkOut=${waitlist.checkOut.toISOString().split("T")[0]}&guests=${waitlist.guests}">Boka nu</a>`
    )
  );
}

/** Admins: ny post i global supporttråd */
export async function emailAdminsSupportThreadMessage(payload: {
  authorName: string;
  content: string;
}) {
  const authorName = escapeHtml(payload.authorName);
  const preview = escapeHtml(payload.content).slice(0, 240);

  await sendToAdmins(
    `Ny fråga i supporttråden från ${payload.authorName}`,
    wrap(
      "Ny fråga i Fråga admin",
      `<p><strong>Från:</strong> ${authorName}</p>
       <p><strong>Meddelande:</strong><br>${preview}${payload.content.length > 240 ? "..." : ""}</p>
       <a class="btn" href="${BASE_URL}/community">Öppna tråden</a>`
    )
  );
}

/** Användare: ny omröstning skapad */
export async function emailUsersNewPoll(
  poll: { question: string; options: string[] },
  recipients: Array<{ name: string; email: string }>
) {
  if (recipients.length === 0) return;

  const question = escapeHtml(poll.question);
  const optionsHtml = poll.options.map((option) => `<li>${escapeHtml(option)}</li>`).join("");

  await Promise.all(
    recipients.map((recipient) =>
      send(
        recipient.email,
        "Ny omröstning i Torbe",
        wrap(
          `Hej ${escapeHtml(recipient.name)}!`,
          `<p>En ny omröstning har publicerats:</p>
           <p><strong>${question}</strong></p>
           <ul>${optionsHtml}</ul>
           <a class="btn" href="${BASE_URL}/community">Rösta i Gemenskap</a>`
        )
      )
    )
  );
}
