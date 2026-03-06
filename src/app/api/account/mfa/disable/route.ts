import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "@otplib/preset-default";
import { z } from "zod";

const schema = z.object({
  code: z.string().length(6),
});

/**
 * POST /api/account/mfa/disable
 * Verifierar TOTP-koden och inaktiverar MFA.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig kod" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "MFA är inte aktiverat" }, { status: 400 });
  }

  const isValid = authenticator.check(parsed.data.code, user.mfaSecret);
  if (!isValid) {
    return NextResponse.json({ error: "Felaktig kod — försök igen" }, { status: 422 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  return NextResponse.json({ ok: true });
}
