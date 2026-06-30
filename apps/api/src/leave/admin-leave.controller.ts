import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { LeaveService } from "./leave.service";

const DecideBody = z.object({ status: z.enum(["aprobada", "rechazada"]) });

const CreateLeaveBody = z
  .object({
    quickerId: z.string().uuid(),
    kind: z.enum(["incapacidad", "licencia", "vacaciones"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().trim().max(500).optional(),
    approve: z.boolean().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "La fecha de fin no puede ser anterior al inicio" });

@Controller("admin/solicitudes")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("leave.manage")
export class AdminLeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get()
  list(@Query("status") status?: string) {
    return this.leave.listAll(status);
  }

  @Get("quickers")
  quickers() {
    return this.leave.quickerOptions();
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = CreateLeaveBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Solicitud inválida");
    }
    const { quickerId, approve, ...input } = parsed.data;
    return this.leave.createForQuicker(quickerId, input, user.id, approve ?? false);
  }

  @Post(":id/decidir")
  decide(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = DecideBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Decisión inválida");
    }
    return this.leave.decide(id, parsed.data.status, user.id);
  }
}
