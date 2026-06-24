import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { BookingService } from "./booking.service";

@Controller("admin/reservas")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("booking.read")
export class AdminBookingController {
  constructor(private readonly bookings: BookingService) {}

  @Get()
  list(@Query("status") status?: string) {
    return this.bookings.listAll({ status });
  }
}
