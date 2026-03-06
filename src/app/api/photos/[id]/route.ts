import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE own photo
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string })?.role;

  const photo = await prisma.visitPhoto.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Bild hittades inte" }, { status: 404 });
  }
  if (role !== "ADMIN" && photo.userId !== userId) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  await prisma.visitPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
