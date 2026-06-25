import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { PayrollPreviewInput } from "./payroll.schemas";
import { PayrollService } from "./payroll.service";

@Controller("admin/nomina")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("compensation.manage")
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get("contratos")
  contracts() {
    return this.payroll.eligibleContracts();
  }

  @Get("historial")
  history() {
    return this.payroll.history();
  }

  @Post("preview")
  preview(@Body() body: unknown) {
    const p = PayrollPreviewInput.safeParse(body);
    if (!p.success) {
      throw new BadRequestException(p.error.issues[0]?.message ?? "Datos inválidos");
    }
    return this.payroll.preview(p.data.contractId, p.data.periodFrom, p.data.periodTo, p.data.extras);
  }

  @Post()
  run(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const p = PayrollPreviewInput.safeParse(body);
    if (!p.success) {
      throw new BadRequestException(p.error.issues[0]?.message ?? "Datos inválidos");
    }
    return this.payroll.run(p.data.contractId, p.data.periodFrom, p.data.periodTo, p.data.extras, user.id);
  }

  @Post(":id/pagar")
  pay(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.payroll.markPaid(id, user.id);
  }
}
