import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { BookingService } from "./booking.service";
import { CreateBookingInput } from "./booking.schemas";

@Controller("reservas")
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.bookings.create(user.id, CreateBookingInput.parse(body));
  }

  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.bookings.listForClient(user.id);
  }

  @Get(":id")
  async one(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const booking = await this.bookings.get(id);
    if (!booking || booking.clientId !== user.id) {
      throw new NotFoundException("Reserva no encontrada");
    }
    return booking;
  }

  @Post(":id/cancelar")
  async cancel(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const booking = await this.bookings.get(id);
    if (!booking || booking.clientId !== user.id) {
      throw new NotFoundException("Reserva no encontrada");
    }
    return this.bookings.cancel(id, user.id);
  }
}
