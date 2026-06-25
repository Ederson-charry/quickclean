import { Controller, Get, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { MetricsService } from "./metrics.service";

@Controller("admin/indicadores")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("booking.read")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  overview() {
    return this.metrics.overview();
  }
}
