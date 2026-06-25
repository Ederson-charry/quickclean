import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { ErpController } from "./erp.controller";
import { ReconciliationService } from "./reconciliation.service";

@Module({
  imports: [AuditModule],
  controllers: [ErpController],
  providers: [ReconciliationService, PrismaService],
  exports: [ReconciliationService],
})
export class ErpModule {}
