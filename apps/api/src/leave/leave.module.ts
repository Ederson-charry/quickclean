import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { AdminLeaveController } from "./admin-leave.controller";
import { QuickerLeaveController } from "./leave.controller";
import { LeaveService } from "./leave.service";

@Module({
  imports: [AuditModule],
  controllers: [QuickerLeaveController, AdminLeaveController],
  providers: [LeaveService, PrismaService],
  exports: [LeaveService],
})
export class LeaveModule {}
