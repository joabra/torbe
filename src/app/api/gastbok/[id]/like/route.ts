import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST - toggle like on a guestbook entry
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const { id: entryId } = await params;
  const userId = (session.user as { id: string }).id;

  const existing = await prisma.guestbookLike.findUnique({
    where: { entryId_userId: { entryId, userId } },
  });

  if (existing) {
    await prisma.guestbookLike.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  } else {
    await prisma.guestbookLike.create({ data: { entryId, userId } });
    return NextResponse.json({ liked: true });
  }
}
