import { Body, Controller, Get, Post } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { PricePreviewInput } from "./catalog.schemas";
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
    return this.tariffs.preview(input.serviceCategoryId, input);
  }
}
