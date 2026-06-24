import { Body, Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { LoginInput } from "@quickclean/shared";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { TurnstileService } from "./turnstile.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly turnstile: TurnstileService,
  ) {}

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
      res.cookie("rt", result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/auth",
      });
      return { accessToken: result.accessToken };
    }
    return result; // { mustChangePassword: true }
  }
}
