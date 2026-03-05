import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  category: z.enum(["RESTAURANT", "EXCURSION", "MARKET", "EVENT", "OTHER"]),
  title: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
  address: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  mapUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const tips = await prisma.tip.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(tips);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });

  const tip = await prisma.tip.create({ data: parsed.data });
  return NextResponse.json(tip, { status: 201 });
}
