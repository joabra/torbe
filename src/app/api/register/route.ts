import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authenticator } from "@otplib/preset-default";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

/**
 * POST /api/register
 * Skapar konto (mfaEnabled=false) och returnerar TOTP-URI för QR-kod.
 * Kontot aktiveras inte förrän /api/register/verify-mfa anropas.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Om kontot redan finns men MFA ej är aktiverat — återanvänd och returnera ny URI
      if (!existing.mfaEnabled && existing.mfaSecret) {
        const otpUri = authenticator.keyuri(email, "Torbe", existing.mfaSecret);
        return NextResponse.json({ ok: true, otpUri, secret: existing.mfaSecret }, { status: 200 });
      }
      return NextResponse.json({ error: "E-postadressen används redan" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const mfaSecret = authenticator.generateSecret();

    await prisma.user.create({
      data: { name, email, password: hash, role: "USER", mfaSecret, mfaEnabled: false, approved: false },
    });

    const otpUri = authenticator.keyuri(email, "Torbe", mfaSecret);
    return NextResponse.json({ ok: true, otpUri, secret: mfaSecret }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}
