-- AlterTable
ALTER TABLE "WorkContract" ADD COLUMN     "monthlySalary" INTEGER;

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "quickerId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "baseSalary" INTEGER NOT NULL,
    "transportAllowance" INTEGER NOT NULL,
    "bonuses" INTEGER NOT NULL,
    "grossEarnings" INTEGER NOT NULL,
    "healthDeduction" INTEGER NOT NULL,
    "pensionDeduction" INTEGER NOT NULL,
    "otherDeductions" INTEGER NOT NULL,
    "totalDeductions" INTEGER NOT NULL,
    "netPay" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'calculada',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollRun_contractId_idx" ON "PayrollRun"("contractId");

-- CreateIndex
CREATE INDEX "PayrollRun_quickerId_idx" ON "PayrollRun"("quickerId");

-- CreateIndex
CREATE INDEX "PayrollRun_status_idx" ON "PayrollRun"("status");

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "WorkContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
