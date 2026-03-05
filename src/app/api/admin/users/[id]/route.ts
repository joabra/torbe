import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { emailUserAccountApproved } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("change-password"), password: z.string().min(6).max(100) }),
]);

/** PATCH /api/admin/users/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltig åtgärd" }, { status: 400 });

  if (parsed.data.action === "approve") {
    const user = await prisma.user.update({ where: { id }, data: { approved: true } });
    void emailUserAccountApproved({ name: user.name, email: user.email });
    return NextResponse.json({ ok: true, approved: true });
  }

  if (parsed.data.action === "change-password") {
    const hash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({ where: { id }, data: { password: hash } });
    return NextResponse.json({ ok: true });
  }

  // reject = ta bort kontot
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}

/** DELETE /api/admin/users/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { id } = await params;
  // Förhindra att admin tar bort sig själv
  const selfId = (session.user as { id?: string }).id;
  if (id === selfId) {
    return NextResponse.json({ error: "Du kan inte ta bort ditt eget konto" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
