import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  active: z.boolean().optional(),
  maxPrice: z.number().int().min(100).max(10000).optional(),
});

async function canAccess(id: string) {
  const session = await auth();
  if (!session?.user) return { allowed: false as const };

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const watch = await prisma.flightWatch.findUnique({ where: { id } });
  if (!watch) return { allowed: false as const, watch: null };
  if (role === "ADMIN" || watch.userId === userId) return { allowed: true as const, watch };
  return { allowed: false as const, watch };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await canAccess(id);
  if (!access.allowed) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || (parsed.data.active === undefined && parsed.data.maxPrice === undefined)) {
    return NextResponse.json({ error: "Ogiltig uppdatering" }, { status: 400 });
  }

  const updated = await prisma.flightWatch.update({
    where: { id },
    data: {
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      ...(parsed.data.maxPrice !== undefined ? { maxPrice: parsed.data.maxPrice } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await canAccess(id);
  if (!access.allowed) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  await prisma.flightWatch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
