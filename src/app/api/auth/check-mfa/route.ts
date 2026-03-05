import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/check-mfa
 * Kontrollerar om e-post+lösenord är giltigt och om MFA krävs.
 * Returnerar { valid, mfaRequired } utan att skapa session.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ valid: false, mfaRequired: false }, { status: 200 });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ valid: false, mfaRequired: false });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ valid: false, mfaRequired: false });

    if (!user.approved) {
      return NextResponse.json({ valid: true, mfaRequired: false, notApproved: true });
    }

    return NextResponse.json({ valid: true, mfaRequired: user.mfaEnabled });
  } catch {
    return NextResponse.json({ valid: false, mfaRequired: false }, { status: 500 });
  }
}
