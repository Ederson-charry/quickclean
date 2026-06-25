import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PrivacyService } from "./privacy.service";

const RectifyBody = z.object({
  phone: z.string().trim().max(20).optional(),
  name: z.string().trim().min(2).max(120).optional(),
});

function ctxOf(req: Request) {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/** Derechos del titular sobre sus propios datos (Habeas Data). */
@Controller("me")
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get("datos")
  export(@CurrentUser() user: AuthUser) {
    return this.privacy.exportData(user.id);
  }

  @Patch("perfil")
  rectify(@Body() body: unknown, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const parsed = RectifyBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }
    return this.privacy.rectify(user.id, parsed.data, ctxOf(req));
  }

  @Get("consentimiento")
  consentStatus(@CurrentUser() user: AuthUser) {
    return this.privacy.consentStatus(user.id);
  }

  @Post("consentimiento")
  giveConsent(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.privacy.giveConsent(user.id, ctxOf(req));
  }

  @Delete("consentimiento")
  withdrawConsent(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.privacy.withdrawConsent(user.id, ctxOf(req));
  }

  @Delete("cuenta")
  deleteAccount(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.privacy.deleteAccount(user.id, ctxOf(req));
  }
}

/** Política pública de tratamiento de datos. */
@Controller("legal")
export class LegalController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get("politica-datos")
  policy() {
    return this.privacy.policy();
  }
}
