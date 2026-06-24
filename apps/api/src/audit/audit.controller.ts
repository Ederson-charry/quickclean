import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { toCsv } from "./audit.csv";
import { type AuditListFilter, AuditService } from "./audit.service";
import type { AuditOutcomeValue } from "./audit.hash";

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

  /** Exporta los eventos filtrados a CSV o JSON. La exportación se audita. */
  @Get("export")
  async export(
    @Query() q: Record<string, string>,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const format = q.format === "csv" ? "csv" : "json";
    const filter: AuditListFilter = {
      action: q.action,
      actorId: q.actorId,
      outcome: q.outcome as AuditOutcomeValue | undefined,
      ip: q.ip,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
    };
    const { items, capped } = await this.audit.export(filter);

    // la exportación queda registrada en la propia bitácora (spec §4.5)
    const appliedFilters: Record<string, string> = {};
    for (const k of ["action", "actorId", "outcome", "ip", "from", "to"] as const) {
      if (q[k]) appliedFilters[k] = q[k];
    }
    await this.audit.record({
      action: "audit.export",
      outcome: "success",
      actorId: user.id,
      metadata: { format, count: items.length, capped, filters: appliedFilters },
    });

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="auditoria.csv"');
      return toCsv(items as unknown as Record<string, unknown>[]);
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="auditoria.json"');
    return items;
  }
}
