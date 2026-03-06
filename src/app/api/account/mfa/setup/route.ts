import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "@otplib/preset-default";

/**
 * POST /api/account/mfa/setup
 * Genererar ett nytt MFA-secret och returnerar OTP-URI för QR-kod.
 * Aktiveras inte förrän /api/account/mfa/confirm anropas.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Användare hittades inte" }, { status: 404 });

  const secret = authenticator.generateSecret();
  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret, mfaEnabled: false } });

  const otpUri = authenticator.keyuri(user.email, "Torbe", secret);
  return NextResponse.json({ secret, otpUri });
}
