import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import {
  CreateClientInput,
  CreateQuickerInput,
  UpdateClientInput,
  UpdateQuickerInput,
} from "./staff.schemas";
import { StaffService } from "./staff.service";

@Controller("admin/quickers")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("user.manage")
export class QuickersAdminController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.listQuickers();
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const p = CreateQuickerInput.safeParse(body);
    if (!p.success) {
      throw new BadRequestException(p.error.issues[0]?.message ?? "Datos inválidos");
    }
    return this.staff.createQuicker(p.data, user.id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const p = UpdateQuickerInput.safeParse(body);
    if (!p.success) {
      throw new BadRequestException(p.error.issues[0]?.message ?? "Datos inválidos");
    }
    return this.staff.updateQuicker(id, p.data, user.id);
  }
}

@Controller("admin/clientes")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("user.manage")
export class ClientsAdminController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.listClients();
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const p = CreateClientInput.safeParse(body);
    if (!p.success) {
      throw new BadRequestException(p.error.issues[0]?.message ?? "Datos inválidos");
    }
    return this.staff.createClient(p.data, user.id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const p = UpdateClientInput.safeParse(body);
    if (!p.success) {
      throw new BadRequestException(p.error.issues[0]?.message ?? "Datos inválidos");
    }
    return this.staff.updateClient(id, p.data, user.id);
  }
}
