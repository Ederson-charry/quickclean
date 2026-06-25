import { Controller, Get, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { NotificationService } from "./notification.service";

@Controller("admin/notificaciones")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("audit.read")
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list() {
    return this.notifications.list();
  }
}
