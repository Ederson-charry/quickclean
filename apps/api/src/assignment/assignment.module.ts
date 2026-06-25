import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { AssignmentController } from "./assignment.controller";
import { AssignmentService } from "./assignment.service";

@Module({
  imports: [AuditModule],
  controllers: [AssignmentController],
  providers: [AssignmentService, PrismaService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
