-- AlterTable
ALTER TABLE "Tariff" ADD COLUMN     "payoutType" TEXT NOT NULL DEFAULT 'percent',
ADD COLUMN     "payoutValue" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- CreateTable
CREATE TABLE "TariffComponent" (
    "id" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationTable" JSONB,
    "appliesOn" TEXT NOT NULL DEFAULT 'base',
    "appliesOnRefs" JSONB,
    "condParam" TEXT,
    "condValue" TEXT,
    "countsForPayout" BOOLEAN NOT NULL DEFAULT true,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TariffComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TariffComponent_tariffId_idx" ON "TariffComponent"("tariffId");

-- AddForeignKey
ALTER TABLE "TariffComponent" ADD CONSTRAINT "TariffComponent_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
