import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ForcedPasswordChangeInput, LoginInput } from "@quickclean/shared";
import type { Request, Response } from "express";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthService } from "./auth.service";
import { REFRESH_COOKIE, refreshCookieOptions } from "./refresh-cookie";
import { TurnstileService } from "./turnstile.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  // Límite estricto: 5 intentos de login por minuto (sobre el global de 20).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = LoginInput.parse(body);
    await this.turnstile.assert(input.turnstileToken, req.ip);
    const result = await this.auth.login(input, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if ("refreshToken" in result) {
      res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions);
      return { accessToken: result.accessToken };
    }
    return result; // { mustChangePassword: true }
  }

  // Cambio de contraseña forzado (primer ingreso). Mismo límite estricto que login.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("cambiar-password")
  @HttpCode(200)
  async changePassword(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = ForcedPasswordChangeInput.parse(body);
    const tokens = await this.auth.changePassword(input, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    return { accessToken: tokens.accessToken };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    try {
      const tokens = await this.auth.refresh(presented, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
      return { accessToken: tokens.accessToken };
    } catch (err) {
      // refresh inválido/expirado/robado → limpia la cookie y propaga 401
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
      throw err;
    }
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  }
}
