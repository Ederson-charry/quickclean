import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AssignmentService } from "./assignment.service";

const AssignBody = z.object({
  bookingId: z.string().uuid(),
  quickerId: z.string().uuid(),
  reason: z.string().optional(),
});

@Controller("admin/asignacion")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("assignment.manage")
export class AssignmentController {
  constructor(private readonly assignment: AssignmentService) {}

  @Get()
  board() {
    return this.assignment.board();
  }

  @Get("candidatos")
  candidatos(@Query("bookingId") bookingId: string) {
    return this.assignment.rankCandidates(bookingId);
  }

  @Post()
  assign(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = AssignBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Datos de asignación inválidos");
    }
    return this.assignment.assign(parsed.data.bookingId, parsed.data.quickerId, user.id, parsed.data.reason);
  }
}
