CREATE TABLE "InstagramLink" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "permalink" TEXT NOT NULL,
  "imageUrl" TEXT,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InstagramLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstagramLink_createdAt_idx" ON "InstagramLink"("createdAt");
CREATE INDEX "InstagramLink_userId_createdAt_idx" ON "InstagramLink"("userId", "createdAt");

ALTER TABLE "InstagramLink"
ADD CONSTRAINT "InstagramLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
