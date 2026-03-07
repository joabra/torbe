import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const prismaWithWaitlist = prisma as typeof prisma & {
  waitlist: {
    findUnique: (args: unknown) => Promise<{ id: string; userId: string } | null>;
    delete: (args: unknown) => Promise<unknown>;
  };
};

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const entry = await prismaWithWaitlist.waitlist.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "Bevakning hittades inte" }, { status: 404 });
  }

  if (role !== "ADMIN" && entry.userId !== userId) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  await prismaWithWaitlist.waitlist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
