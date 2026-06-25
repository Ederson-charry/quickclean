import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateContractInput } from "./contracts.schemas";
import { ContractsService } from "./contracts.service";

@Controller("admin/contratos")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("contract.manage")
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  list() {
    return this.contracts.list();
  }

  @Get("opciones")
  options() {
    return this.contracts.options();
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = CreateContractInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Contrato inválido");
    }
    return this.contracts.create(parsed.data, user.id);
  }

  @Post(":id/finalizar")
  finalize(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.contracts.finalize(id, user.id);
  }
}
