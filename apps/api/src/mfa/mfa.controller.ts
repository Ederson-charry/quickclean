import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { MfaService } from "./mfa.service";

// Límite estricto: el código TOTP es de 6 dígitos; evita fuerza bruta sobre /mfa.
@Controller("mfa")
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class MfaController {
  constructor(private readonly mfa: MfaService) {}

  @Post("enroll")
  enroll(@CurrentUser() user: AuthUser) {
    return this.mfa.enroll(user.id);
  }

  @Post("confirm")
  async confirm(@CurrentUser() user: AuthUser, @Body() body: { token: string }) {
    return { confirmed: await this.mfa.confirm(user.id, body.token) };
  }

  @Post("verify")
  async verify(@CurrentUser() user: AuthUser, @Body() body: { token: string }) {
    return { valid: await this.mfa.verify(user.id, body.token) };
  }
}
