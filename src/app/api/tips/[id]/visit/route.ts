import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const prismaWithVisit = prisma as typeof prisma & {
  tipVisit: {
    upsert: (...args: any[]) => Promise<any>;
    deleteMany: (...args: any[]) => Promise<any>;
  };
};

const schema = z.object({
  note: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  }

  const existing = await prisma.tip.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Tipset finns inte" }, { status: 404 });
  }

  const visit = await prismaWithVisit.tipVisit.upsert({
    where: { tipId_userId: { tipId: id, userId: session.user.id } },
    update: {
      note: parsed.data.note ?? null,
      rating: parsed.data.rating ?? null,
      visitedAt: new Date(),
    },
    create: {
      tipId: id,
      userId: session.user.id,
      note: parsed.data.note ?? null,
      rating: parsed.data.rating ?? null,
    },
  });

  return NextResponse.json(visit);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id } = await params;
  await prismaWithVisit.tipVisit.deleteMany({ where: { tipId: id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
