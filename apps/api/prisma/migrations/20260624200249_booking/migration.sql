-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('agendado', 'en_curso', 'completado', 'cancelado');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceCategoryId" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "supplies" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "pets" BOOLEAN NOT NULL DEFAULT false,
    "priceLabor" INTEGER NOT NULL,
    "priceTotal" INTEGER NOT NULL,
    "payout" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'agendado',
    "quickerId" TEXT,
    "ratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_serviceCategoryId_idx" ON "Booking"("serviceCategoryId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_quickerId_fkey" FOREIGN KEY ("quickerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
