import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { PublishTariffInput } from "./catalog.schemas";
import { TariffService } from "./tariff.service";

@Controller("admin/tarifas")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TarifasController {
  constructor(private readonly tariffs: TariffService) {}

  @Get()
  @RequirePermissions("tariff.read")
  async get(@Query("categoryId") categoryId: string) {
    const [active, history] = await Promise.all([
      this.tariffs.getActive(categoryId),
      this.tariffs.history(categoryId),
    ]);
    return { active, history };
  }

  // TODO: step-up 2FA (MfaGuard) antes de publicar — spec §5.4.
  @Post()
  @RequirePermissions("tariff.assign")
  publish(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.tariffs.publish(PublishTariffInput.parse(body), user.id);
  }
}
