import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/account/me
 * Returnerar inloggad användares profilinfo inkl MFA-status.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, mfaEnabled: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Användare hittades inte" }, { status: 404 });
  }

  return NextResponse.json(user);
}
