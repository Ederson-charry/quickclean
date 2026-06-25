import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { LegalController, PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";

@Module({
  imports: [AuditModule],
  controllers: [PrivacyController, LegalController],
  providers: [PrivacyService, PrismaService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
