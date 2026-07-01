import { Body, Controller, Get, Post } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { PricePreviewInput } from "./catalog.schemas";
import { isColombianHoliday } from "./holidays";
import { TariffService } from "./tariff.service";

/** Catálogo público para el flujo de reserva del front. */
@Controller("catalogo")
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly tariffs: TariffService,
  ) {}

  @Get()
  list() {
    return this.catalog.listActive();
  }

  @Post("precio")
  preview(@Body() body: unknown) {
    const input = PricePreviewInput.parse(body);
    // Si se envió la fecha, el festivo se determina en el backend (fuente única).
    const holiday = input.scheduledAt ? isColombianHoliday(input.scheduledAt) : input.holiday;
    return this.tariffs.preview(input.serviceCategoryId, { ...input, holiday });
  }
}
