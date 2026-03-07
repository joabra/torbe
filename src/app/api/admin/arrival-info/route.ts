import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const arrivalSchema = z.object({
  wifiName: z.string().max(100).optional().default(""),
  wifiPassword: z.string().max(100).optional().default(""),
  checkInInstructions: z.string().max(2000).optional().default(""),
  parkingInfo: z.string().max(500).optional().default(""),
  houseRules: z.string().max(2000).optional().default(""),
  emergencyContact: z.string().max(200).optional().default(""),
  departureChecklist: z.array(z.string().max(200)).optional().default([]),
  manualSections: z.array(
    z.object({
      title: z.string().min(1).max(120),
      content: z.string().min(1).max(4000),
    })
  ).max(20).optional().default([]),
});

// GET - authenticated users with approved booking may read
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const role = (session.user as { role?: string })?.role;
  const userId = (session.user as { id: string }).id;

  // User must have at least one approved booking, or be admin
  if (role !== "ADMIN") {
    const approvedBooking = await prisma.booking.findFirst({
      where: { userId, status: "APPROVED" },
    });
    if (!approvedBooking) {
      return NextResponse.json({ error: "Åtkomst nekad – inga godkända bokningar" }, { status: 403 });
    }
  }

  const info = await prisma.apartmentInfo.findFirst();
  const arrivalInfo = (info?.arrivalInfo ?? {}) as Record<string, string>;

  return NextResponse.json(arrivalInfo);
}

// PUT - admin only
export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = arrivalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  }

  const existing = await prisma.apartmentInfo.findFirst();
  if (existing) {
    await prisma.apartmentInfo.update({
      where: { id: existing.id },
      data: { arrivalInfo: parsed.data },
    });
  } else {
    await prisma.apartmentInfo.create({
      data: {
        title: "Torbe",
        description: "",
        maxGuests: 8,
        arrivalInfo: parsed.data,
      },
    });
  }

  return NextResponse.json(parsed.data);
}
