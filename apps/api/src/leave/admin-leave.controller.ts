import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { LeaveService } from "./leave.service";

const DecideBody = z.object({ status: z.enum(["aprobada", "rechazada"]) });

@Controller("admin/solicitudes")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("leave.manage")
export class AdminLeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get()
  list(@Query("status") status?: string) {
    return this.leave.listAll(status);
  }

  @Post(":id/decidir")
  decide(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = DecideBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Decisión inválida");
    }
    return this.leave.decide(id, parsed.data.status, user.id);
  }
}
