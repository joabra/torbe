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
});

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  return session?.user && role === "ADMIN";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const { id } = await params;
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
  if (!(await requireAdmin())) return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });

  const { id } = await params;
  await prisma.tip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
