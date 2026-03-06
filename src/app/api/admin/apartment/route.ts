import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(5).max(2000),
  maxGuests: z.number().int().min(1).max(50),
  bedrooms: z.number().int().min(1).max(20),
  bathrooms: z.number().int().min(1).max(20),
  distanceToBeach: z.string().max(50),
});

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const info = await prisma.apartmentInfo.findFirst();
  if (!info) return NextResponse.json(null);

  // Parse features JSON to extract bedrooms, bathrooms, distanceToBeach
  const features = info.features as Record<string, string | number>;
  return NextResponse.json({
    id: info.id,
    title: info.title,
    description: info.description,
    maxGuests: info.maxGuests,
    bedrooms: features.bedrooms ?? 3,
    bathrooms: features.bathrooms ?? 2,
    distanceToBeach: features.distanceToBeach ?? "50 m",
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  }

  const { title, description, maxGuests, bedrooms, bathrooms, distanceToBeach } = parsed.data;
  const features = { bedrooms, bathrooms, distanceToBeach };

  const existing = await prisma.apartmentInfo.findFirst();
  let info;
  if (existing) {
    info = await prisma.apartmentInfo.update({
      where: { id: existing.id },
      data: { title, description, maxGuests, features },
    });
  } else {
    info = await prisma.apartmentInfo.create({
      data: { title, description, maxGuests, features },
    });
  }

  return NextResponse.json({
    id: info.id,
    title: info.title,
    description: info.description,
    maxGuests: info.maxGuests,
    bedrooms,
    bathrooms,
    distanceToBeach,
  });
}
