import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CompensationService } from "./compensation.service";

const LiquidateBody = z.object({ quickerId: z.string().uuid() });

@Controller("admin/compensacion")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("compensation.manage")
export class CompensationController {
  constructor(private readonly compensation: CompensationService) {}

  @Get()
  pending() {
    return this.compensation.pendingByQuicker();
  }

  @Get("historial")
  history() {
    return this.compensation.history();
  }

  @Post("liquidar")
  liquidate(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = LiquidateBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("quickerId inválido");
    }
    return this.compensation.liquidate(parsed.data.quickerId, user.id);
  }

  @Post(":id/pagar")
  pay(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.compensation.markPaid(id, user.id);
  }
}
