-- CreateEnum
CREATE TYPE "CronJobType" AS ENUM ('REMINDERS', 'FLIGHT_WATCH');

-- CreateEnum
CREATE TYPE "CronJobSource" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "CronJobStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "CronJobRun" (
  "id" TEXT NOT NULL,
  "job" "CronJobType" NOT NULL,
  "source" "CronJobSource" NOT NULL,
  "status" "CronJobStatus" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "result" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CronJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronJobRun_job_createdAt_idx" ON "CronJobRun"("job", "createdAt");

-- CreateIndex
CREATE INDEX "CronJobRun_createdAt_idx" ON "CronJobRun"("createdAt");
