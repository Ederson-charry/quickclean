-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('contractor', 'employee');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'persona',
    "requiresDirectHire" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkContract" (
    "id" TEXT NOT NULL,
    "quickerId" TEXT NOT NULL,
    "clientId" TEXT,
    "engagementType" "EngagementType" NOT NULL,
    "position" TEXT,
    "contractKind" TEXT NOT NULL DEFAULT 'prestacion',
    "status" TEXT NOT NULL DEFAULT 'activo',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "WorkContract_quickerId_idx" ON "WorkContract"("quickerId");

-- CreateIndex
CREATE INDEX "WorkContract_clientId_idx" ON "WorkContract"("clientId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkContract" ADD CONSTRAINT "WorkContract_quickerId_fkey" FOREIGN KEY ("quickerId") REFERENCES "Quicker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkContract" ADD CONSTRAINT "WorkContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
