import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { BookingService } from "./booking.service";

const QuickerStatusBody = z.object({ status: z.enum(["en_curso", "completado"]) });

@Controller("quicker")
@UseGuards(JwtAuthGuard)
export class QuickerController {
  constructor(private readonly bookings: BookingService) {}

  @Get("reservas")
  mine(@CurrentUser() user: AuthUser) {
    return this.bookings.listForQuicker(user.id);
  }

  @Post("reservas/:id/estado")
  async estado(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = QuickerStatusBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Estado inválido");
    }
    const booking = await this.bookings.get(id);
    if (!booking || booking.quickerId !== user.id) {
      throw new NotFoundException("Reserva no encontrada");
    }
    return this.bookings.transition(id, parsed.data.status, user.id);
  }
}
