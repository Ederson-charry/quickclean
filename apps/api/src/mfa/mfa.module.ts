import { Module } from "@nestjs/common";
import { EncryptionService } from "../common/encryption.service";
import { MfaGuard } from "../common/guards/mfa.guard";
import { PrismaService } from "../prisma/prisma.service";
import { MfaController } from "./mfa.controller";
import { MfaService } from "./mfa.service";

@Module({
  controllers: [MfaController],
  providers: [MfaService, MfaGuard, EncryptionService, PrismaService],
  exports: [MfaService, MfaGuard],
})
export class MfaModule {}
