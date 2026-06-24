import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { InactivityService } from "./inactivity.service";
import { UsersService } from "./users.service";

@Module({
  imports: [AuditModule],
  providers: [UsersService, InactivityService, PrismaService],
  exports: [UsersService, InactivityService],
})
export class UsersModule {}
