import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** POST /api/admin/cron/reminders — trigger reminders cron manually */
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET saknas" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const response = await fetch(`${origin}/api/cron/reminders`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "x-cron-source": "manual",
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ error: "Ogiltigt svar från cron-route" }));
  return NextResponse.json(data, { status: response.status });
}
