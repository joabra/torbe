import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.guestbookEntry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const u = session.user as { id: string; role?: string };
  const isOwner = entry.authorId === u.id;
  const isAdmin = u.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.guestbookEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
