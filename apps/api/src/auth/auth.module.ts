import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LockoutService } from "./lockout.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { TurnstileService } from "./turnstile.service";

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({ secret: cfg.get<string>("JWT_SECRET") }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    LockoutService,
    TokenService,
    TurnstileService,
    PrismaService,
  ],
  exports: [TokenService, JwtModule],
})
export class AuthModule {}
