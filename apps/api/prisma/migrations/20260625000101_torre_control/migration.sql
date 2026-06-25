-- CreateTable
CREATE TABLE "Quicker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quicker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickerSkill" (
    "id" TEXT NOT NULL,
    "quickerId" TEXT NOT NULL,
    "serviceCategoryId" TEXT NOT NULL,
    "level" INTEGER,

    CONSTRAINT "QuickerSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAssignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "quickerId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "ServiceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quicker_userId_key" ON "Quicker"("userId");

-- CreateIndex
CREATE INDEX "Quicker_active_idx" ON "Quicker"("active");

-- CreateIndex
CREATE INDEX "QuickerSkill_serviceCategoryId_idx" ON "QuickerSkill"("serviceCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "QuickerSkill_quickerId_serviceCategoryId_key" ON "QuickerSkill"("quickerId", "serviceCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAssignment_bookingId_key" ON "ServiceAssignment"("bookingId");

-- CreateIndex
CREATE INDEX "ServiceAssignment_quickerId_idx" ON "ServiceAssignment"("quickerId");

-- AddForeignKey
ALTER TABLE "Quicker" ADD CONSTRAINT "Quicker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickerSkill" ADD CONSTRAINT "QuickerSkill_quickerId_fkey" FOREIGN KEY ("quickerId") REFERENCES "Quicker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickerSkill" ADD CONSTRAINT "QuickerSkill_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAssignment" ADD CONSTRAINT "ServiceAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAssignment" ADD CONSTRAINT "ServiceAssignment_quickerId_fkey" FOREIGN KEY ("quickerId") REFERENCES "Quicker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
