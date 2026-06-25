import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { LeaveService } from "./leave.service";

const SubmitLeaveBody = z
  .object({
    kind: z.enum(["incapacidad", "licencia", "vacaciones"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "La fecha de fin no puede ser anterior al inicio" });

@Controller("quicker/solicitudes")
@UseGuards(JwtAuthGuard)
export class QuickerLeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.leave.listForQuicker(user.id);
  }

  @Post()
  submit(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const parsed = SubmitLeaveBody.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Solicitud inválida");
    }
    return this.leave.submit(user.id, parsed.data);
  }
}
