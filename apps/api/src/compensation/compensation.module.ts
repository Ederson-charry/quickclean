import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { CompensationController } from "./compensation.controller";
import { CompensationService } from "./compensation.service";

@Module({
  imports: [AuditModule],
  controllers: [CompensationController],
  providers: [CompensationService, PrismaService],
  exports: [CompensationService],
})
export class CompensationModule {}
