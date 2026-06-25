import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuditModule } from "../audit/audit.module";
import { NotificationModule } from "../notifications/notification.module";
import { PrismaService } from "../prisma/prisma.service";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { LockoutService } from "./lockout.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { TurnstileService } from "./turnstile.service";

@Module({
  imports: [
    UsersModule,
    AuditModule,
    NotificationModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const secret = cfg.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error("JWT_SECRET no está configurado");
        }
        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    LockoutService,
    TokenService,
    TurnstileService,
    JwtStrategy,
    PrismaService,
  ],
  exports: [TokenService, JwtModule, PassportModule],
})
export class AuthModule {}
