import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { emailAdminsSupportThreadMessage } from "@/lib/email";

const schema = z.object({
  content: z.string().trim().min(2).max(1000),
});

export async function GET() {
  const messages = await prisma.supportMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json(messages.reverse());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltigt meddelande" }, { status: 400 });
  }

  const authorId = (session.user as { id: string }).id;
  const authorName = (session.user as { name?: string }).name ?? "Familjemedlem";

  const message = await prisma.supportMessage.create({
    data: {
      content: parsed.data.content,
      authorId,
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      approved: true,
      id: { not: authorId },
    },
    select: { id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "SUPPORT_MESSAGE",
        title: "Ny fråga i Fråga admin",
        body: `${authorName}: ${parsed.data.content.slice(0, 120)}${parsed.data.content.length > 120 ? "..." : ""}`,
        linkUrl: "/community",
      })),
    });
  }

  await emailAdminsSupportThreadMessage({
    authorName,
    content: parsed.data.content,
  });

  return NextResponse.json(message, { status: 201 });
}
