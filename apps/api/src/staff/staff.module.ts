import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PasswordService } from "../auth/password.service";
import { PrismaService } from "../prisma/prisma.service";
import { ClientsAdminController, QuickersAdminController } from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
  imports: [AuditModule],
  controllers: [QuickersAdminController, ClientsAdminController],
  providers: [StaffService, PasswordService, PrismaService],
  exports: [StaffService],
})
export class StaffModule {}
