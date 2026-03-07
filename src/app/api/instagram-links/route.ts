import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  permalink: z.string().url().refine((url) => /instagram\.com\//i.test(url), "Måste vara en Instagram-länk"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  caption: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function GET() {
  const links = await prisma.instagramLink.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig Instagram-länk" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const link = await prisma.instagramLink.create({
    data: {
      userId,
      permalink: parsed.data.permalink,
      imageUrl: parsed.data.imageUrl || null,
      caption: parsed.data.caption || null,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(link, { status: 201 });
}
