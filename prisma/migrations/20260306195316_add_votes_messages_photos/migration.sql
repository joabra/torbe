-- CreateTable
CREATE TABLE "TipVote" (
    "id" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingMessage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "bookingId" TEXT,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipVote_tipId_userId_key" ON "TipVote"("tipId", "userId");

-- AddForeignKey
ALTER TABLE "TipVote" ADD CONSTRAINT "TipVote_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipVote" ADD CONSTRAINT "TipVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
