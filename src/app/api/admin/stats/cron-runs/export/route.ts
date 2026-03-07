import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function csvEscape(value: unknown) {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const job = params.get("job");
  const source = params.get("source");
  const status = params.get("status");
  const search = params.get("search")?.trim();

  const where = {
    ...(job && job !== "ALL" ? { job: job as "REMINDERS" | "FLIGHT_WATCH" } : {}),
    ...(source && source !== "ALL" ? { source: source as "SCHEDULED" | "MANUAL" } : {}),
    ...(status && status !== "ALL" ? { status: status as "SUCCESS" | "ERROR" } : {}),
    ...(search
      ? {
          OR: [
            { error: { contains: search, mode: "insensitive" as const } },
            { job: { equals: search.toUpperCase() as "REMINDERS" | "FLIGHT_WATCH" } },
            { source: { equals: search.toUpperCase() as "SCHEDULED" | "MANUAL" } },
            { status: { equals: search.toUpperCase() as "SUCCESS" | "ERROR" } },
          ],
        }
      : {}),
  };

  const runs = await prisma.cronJobRun.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const header = [
    "id",
    "job",
    "source",
    "status",
    "createdAt",
    "startedAt",
    "finishedAt",
    "durationMs",
    "error",
    "result",
  ];

  const rows = runs.map((run) => [
    run.id,
    run.job,
    run.source,
    run.status,
    run.createdAt.toISOString(),
    run.startedAt.toISOString(),
    run.finishedAt?.toISOString() ?? "",
    run.durationMs ?? "",
    run.error ?? "",
    run.result ? JSON.stringify(run.result) : "",
  ]);

  const csv = [header, ...rows]
    .map((line) => line.map((cell) => csvEscape(cell)).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cron-runs-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
