import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuditService } from "../audit/audit.service";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ReconciliationService, reconciliationToCsv } from "./reconciliation.service";

const parseDate = (s?: string): Date | undefined => (s ? new Date(s) : undefined);

@Controller("admin/conciliacion")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePermissions("erp.read")
export class ErpController {
  constructor(
    private readonly recon: ReconciliationService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  report(@Query("from") from?: string, @Query("to") to?: string) {
    return this.recon.report(parseDate(from), parseDate(to));
  }

  /** Export estructurado del reporte para el ERP (CSV/JSON). Auditado. */
  @Get("export")
  async export(
    @Query("format") formatRaw: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const format = formatRaw === "csv" ? "csv" : "json";
    const report = await this.recon.report(parseDate(from), parseDate(to));

    await this.audit.record({
      action: "erp.export",
      outcome: "success",
      actorId: user.id,
      resourceType: "reconciliation",
      metadata: { format, count: report.summary.count, from: from ?? null, to: to ?? null },
    });

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="conciliacion.csv"');
      return reconciliationToCsv(report.items);
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="conciliacion.json"');
    return report;
  }
}
