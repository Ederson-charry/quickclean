import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";

@Module({
  imports: [AuditModule],
  controllers: [ContractsController],
  providers: [ContractsService, PrismaService],
  exports: [ContractsService],
})
export class ContractsModule {}
