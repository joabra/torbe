-- CreateTable
CREATE TABLE "GuestbookEntry" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "visitYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestbookEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GuestbookEntry" ADD CONSTRAINT "GuestbookEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
