import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { BookingService } from "./booking.service";

const StatusBody = z.object({
  status: z.enum(["en_curso", "completado", "cancelado"]),
});

@Controller("admin/reservas")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminBookingController {
  constructor(private readonly bookings: BookingService) {}

  @Get()
  @RequirePermissions("booking.read")
  list(@Query("status") status?: string) {
    return this.bookings.listAll({ status });
  }

  @Post(":id/estado")
  @RequirePermissions("booking.manage")
  changeStatus(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = StatusBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Estado inválido");
    }
    return this.bookings.transition(id, parsed.data.status, user.id);
  }
}
