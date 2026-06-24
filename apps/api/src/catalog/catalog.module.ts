import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { ServiciosController } from "./servicios.controller";
import { TariffService } from "./tariff.service";
import { TarifasController } from "./tarifas.controller";

@Module({
  imports: [AuditModule],
  controllers: [CatalogController, ServiciosController, TarifasController],
  providers: [CatalogService, TariffService, PrismaService],
  exports: [CatalogService, TariffService],
})
export class CatalogModule {}
