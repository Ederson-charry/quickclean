import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuditModule } from "./audit/audit.module";
import { UsersModule } from "./users/users.module";
import { AssignmentModule } from "./assignment/assignment.module";
import { AuthModule } from "./auth/auth.module";
import { BookingModule } from "./booking/booking.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CompensationModule } from "./compensation/compensation.module";
import { ErpModule } from "./erp/erp.module";
import { HealthController } from "./health/health.controller";
import { LeaveModule } from "./leave/leave.module";
import { MfaModule } from "./mfa/mfa.module";
import { PrismaService } from "./prisma/prisma.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    AuthModule,
    MfaModule,
    AuditModule,
    CatalogModule,
    BookingModule,
    AssignmentModule,
    CompensationModule,
    ErpModule,
    LeaveModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
