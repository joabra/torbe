import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { emailUserAccountApproved } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
});

/** PATCH /api/admin/users/[id] — godkänn eller avslå (ta bort) konto */
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltig åtgärd" }, { status: 400 });

  const { action } = parsed.data;

  if (action === "approve") {
    const user = await prisma.user.update({
      where: { id },
      data: { approved: true },
    });
    void emailUserAccountApproved({ name: user.name, email: user.email });
    return NextResponse.json({ ok: true, approved: true });
  }

  // reject = ta bort kontot
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
