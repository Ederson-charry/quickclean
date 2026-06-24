import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import type { AuditOutcomeValue } from "./audit.hash";
import { AuditService } from "./audit.service";

@Controller("admin/auditoria")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("audit.read")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() q: Record<string, string>) {
    return this.audit.list({
      action: q.action,
      actorId: q.actorId,
      outcome: q.outcome as AuditOutcomeValue | undefined,
      ip: q.ip,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    });
  }

  @Get("verify")
  verify() {
    return this.audit.verifyChain();
  }
}
