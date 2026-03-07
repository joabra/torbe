import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

// PATCH - user accepts or rejects a date proposal
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }

  const { id: bookingId, proposalId } = await params;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string })?.role;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: "Hittades inte" }, { status: 404 });

  // Only owner or admin can update proposals
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const proposal = await prisma.dateProposal.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.bookingId !== bookingId) {
    return NextResponse.json({ error: "Förslag hittades inte" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga uppgifter" }, { status: 400 });
  }

  const updated = await prisma.dateProposal.update({
    where: { id: proposalId },
    data: { status: parsed.data.status },
  });

  // If accepted, update the booking dates
  if (parsed.data.status === "ACCEPTED") {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkIn: proposal.proposedCheckIn,
        checkOut: proposal.proposedCheckOut,
      },
    });
  }

  return NextResponse.json(updated);
}

// DELETE - admin removes a date proposal
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { proposalId } = await params;
  await prisma.dateProposal.delete({ where: { id: proposalId } });
  return NextResponse.json({ ok: true });
}
