import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { AdminBookingController } from "./admin-booking.controller";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";

@Module({
  imports: [AuditModule],
  controllers: [BookingController, AdminBookingController],
  providers: [BookingService, PrismaService],
  exports: [BookingService],
})
export class BookingModule {}
