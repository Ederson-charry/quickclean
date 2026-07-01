import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { MfaService } from "../mfa/mfa.service";
import { PublishTariffInput, SimulateTariffInput } from "./catalog.schemas";
import { TariffService } from "./tariff.service";

@Controller("admin/tarifas")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TarifasController {
  constructor(
    private readonly tariffs: TariffService,
    private readonly mfa: MfaService,
  ) {}

  @Get()
  @RequirePermissions("tariff.read")
  async get(@Query("categoryId") categoryId: string) {
    const [active, history] = await Promise.all([
      this.tariffs.getActive(categoryId),
      this.tariffs.history(categoryId),
    ]);
    return { active, history };
  }

  // Simulación del precio con reglas de borrador (antes de publicar la versión).
  @Post("simular")
  @RequirePermissions("tariff.read")
  simulate(@Body() body: unknown) {
    const parsed = SimulateTariffInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }
    const { rules, ...input } = parsed.data;
    return this.tariffs.simulate(rules, input);
  }

  // Step-up 2FA (spec §5.4): si el usuario tiene 2FA enrolada, exige OTP fresco.
  @Post()
  @RequirePermissions("tariff.assign")
  async publish(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = PublishTariffInput.parse(body);
    if (await this.mfa.isEnrolled(user.id)) {
      if (!input.otp || !(await this.mfa.verify(user.id, input.otp))) {
        throw new ForbiddenException("Se requiere verificación 2FA (step-up) para publicar tarifas");
      }
    }
    return this.tariffs.publish(input, user.id);
  }

  @Post(":id/desactivar")
  @RequirePermissions("tariff.assign")
  deactivate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.tariffs.deactivate(id, user.id);
  }
}
