import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  category: z.enum(["RESTAURANT", "EXCURSION", "MARKET", "EVENT", "OTHER"]).optional(),
  title: z.string().min(2).max(100).optional(),
  description: z.string().min(5).max(1000).optional(),
  address: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  mapUrl: z.string().url().optional().or(z.literal("")),
  openMonths: z.array(z.number().int().min(1).max(12)).optional(),
  seasonNote: z.string().max(200).optional(),
});

async function canModify(tipId: string) {
  const session = await auth();
  if (!session?.user?.id) return false;
  const tip = await prisma.tip.findUnique({ where: { id: tipId } });
  if (!tip) return false;
  const role = (session.user as { role?: string }).role;
  // Admin kan ändra alla tips; vanliga användare bara sina egna
  return role === "ADMIN" || tip.createdById === session.user.id;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await canModify(id))) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });

  const tip = await prisma.tip.update({ where: { id }, data: parsed.data });
  return NextResponse.json(tip);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await canModify(id))) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  await prisma.tip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
