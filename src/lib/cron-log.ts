import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type CronJobType = "REMINDERS" | "FLIGHT_WATCH";
type CronJobSource = "SCHEDULED" | "MANUAL";

type SuccessPayload = {
  [key: string]: Prisma.JsonValue;
};

export async function logCronSuccess(
  job: CronJobType,
  source: CronJobSource,
  startedAt: Date,
  result: SuccessPayload
) {
  const finishedAt = new Date();
  await prisma.cronJobRun.create({
    data: {
      job,
      source,
      status: "SUCCESS",
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      result,
    },
  });
}

export async function logCronError(
  job: CronJobType,
  source: CronJobSource,
  startedAt: Date,
  error: unknown
) {
  const finishedAt = new Date();
  const message = error instanceof Error ? error.message : "Unknown error";
  await prisma.cronJobRun.create({
    data: {
      job,
      source,
      status: "ERROR",
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      error: message.slice(0, 2000),
    },
  });
}
