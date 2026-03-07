import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const { id } = await context.params;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  const link = await prisma.instagramLink.findUnique({ where: { id } });
  if (!link) {
    return NextResponse.json({ error: "Länk hittades inte" }, { status: 404 });
  }

  if (role !== "ADMIN" && link.userId !== userId) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  await prisma.instagramLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
