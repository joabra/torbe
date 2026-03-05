import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticator } from "@otplib/preset-default";
import { emailAdminNewUser, emailUserAwaitingApproval } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

/**
 * POST /api/register/verify-mfa
 * Bekräftar TOTP-koden och aktiverar MFA på kontot.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.mfaSecret) {
      return NextResponse.json({ error: "Kontot hittades inte" }, { status: 404 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ ok: true }); // redan aktiverat
    }

    const isValid = authenticator.check(code, user.mfaSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Felaktig kod — försök igen" }, { status: 422 });
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { mfaEnabled: true },
    });

    // Notifiera admin och bekräfta för användaren
    await Promise.all([
      emailAdminNewUser({ name: updated.name, email: updated.email }),
      emailUserAwaitingApproval({ name: updated.name, email: updated.email }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}
