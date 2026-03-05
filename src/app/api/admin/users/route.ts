import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

/** GET /api/admin/users — lista alla användare */
export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approved: true,
      mfaEnabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

/** POST /api/admin/users — skapa ny användare direkt (godkänd, ingen MFA-flow) */
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  }

  const { name, email, password, role: newRole } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-postadressen används redan" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: newRole, approved: true, mfaEnabled: false },
    select: { id: true, name: true, email: true, role: true, approved: true, mfaEnabled: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
