import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AuditService } from "../audit/audit.service";
import { security } from "../config/security.config";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InactivityService {
  private readonly logger = new Logger(InactivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Marca como `inactive` a las cuentas activas sin actividad por > 90 días
   * (política 90/90). El login ya bloquea inactivos y exige reactivación.
   * Devuelve cuántas cuentas se marcaron. El barrido se audita si afecta filas.
   */
  async markInactive(): Promise<number> {
    const cutoff = new Date(Date.now() - security.inactivityDisableDays * 86_400_000);
    const res = await this.prisma.user.updateMany({
      where: { status: "active", lastActivityAt: { lt: cutoff } },
      data: { status: "inactive" },
    });
    if (res.count > 0) {
      await this.audit.record({
        action: "security.inactivity_sweep",
        outcome: "success",
        actorId: null,
        metadata: { count: res.count, cutoff: cutoff.toISOString() },
      });
    }
    return res.count;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    const count = await this.markInactive();
    if (count > 0) {
      this.logger.log(`Barrido de inactividad: ${count} cuenta(s) marcadas inactive`);
    }
  }
}
