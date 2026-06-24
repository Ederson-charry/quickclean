import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CatalogService } from "./catalog.service";
import { CreateCategoryInput } from "./catalog.schemas";

@Controller("admin/servicios")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiciosController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @RequirePermissions("service.read")
  list() {
    return this.catalog.listAll();
  }

  @Post()
  @RequirePermissions("service.update")
  create(@Body() body: unknown) {
    return this.catalog.create(CreateCategoryInput.parse(body));
  }

  @Post(":id/archivar")
  @RequirePermissions("service.update")
  archive(@Param("id") id: string) {
    return this.catalog.archive(id);
  }
}
