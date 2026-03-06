import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST = toggle vote (like / unlike)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const { id: tipId } = await params;
  const userId = (session.user as { id: string }).id;

  const existing = await prisma.tipVote.findUnique({
    where: { tipId_userId: { tipId, userId } },
  });

  if (existing) {
    await prisma.tipVote.delete({ where: { id: existing.id } });
    const count = await prisma.tipVote.count({ where: { tipId } });
    return NextResponse.json({ liked: false, count });
  } else {
    await prisma.tipVote.create({ data: { tipId, userId } });
    const count = await prisma.tipVote.count({ where: { tipId } });
    return NextResponse.json({ liked: true, count });
  }
}
