import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /** KPIs del panel de control, agregados desde los datos reales. */
  async overview() {
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [completedBookings, statusGroups, activeQuickers, totalClients, empresas, pendingPayoutAgg, paidPayoutAgg, payrollAgg, quickers] =
      await Promise.all([
        this.prisma.booking.findMany({
          where: { status: "completado" },
          select: { priceTotal: true, scheduledAt: true },
        }),
        this.prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.quicker.count({ where: { active: true } }),
        this.prisma.client.count(),
        this.prisma.client.count({ where: { kind: "empresa" } }),
        this.prisma.booking.aggregate({
          where: { status: "completado", payoutId: null },
          _sum: { payout: true },
        }),
        this.prisma.payout.aggregate({ where: { status: "pagado" }, _sum: { amount: true } }),
        this.prisma.payrollRun.aggregate({ _sum: { netPay: true }, _count: { _all: true } }),
        this.prisma.quicker.findMany({ where: { active: true }, select: { name: true, zone: true, rating: true } }),
      ]);

    // Ingresos por mes (últimos 6) en millones
    const byMonthMap = new Map<string, number>();
    for (const b of completedBookings) {
      byMonthMap.set(monthKey(b.scheduledAt), (byMonthMap.get(monthKey(b.scheduledAt)) ?? 0) + b.priceTotal);
    }
    const revenueByMonth: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = byMonthMap.get(monthKey(d)) ?? 0;
      revenueByMonth.push({ month: MONTHS_ES[d.getMonth()], value: Math.round((total / 1_000_000) * 10) / 10 });
    }

    const revenueMonth = completedBookings
      .filter((b) => b.scheduledAt >= startThisMonth)
      .reduce((s, b) => s + b.priceTotal, 0);
    const revenuePrev = completedBookings
      .filter((b) => b.scheduledAt >= startPrevMonth && b.scheduledAt < startThisMonth)
      .reduce((s, b) => s + b.priceTotal, 0);
    const completedMonth = completedBookings.filter((b) => b.scheduledAt >= startThisMonth).length;
    const completedPrev = completedBookings.filter(
      (b) => b.scheduledAt >= startPrevMonth && b.scheduledAt < startThisMonth,
    ).length;

    const pct = (cur: number, prev: number): number =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

    const STATUS_LABEL: Record<string, string> = {
      agendado: "Agendados",
      en_curso: "En curso",
      completado: "Completados",
      cancelado: "Cancelados",
    };
    const byStatus = statusGroups.map((g) => ({
      name: STATUS_LABEL[g.status] ?? g.status,
      value: g._count._all,
    }));

    const zoneMap = new Map<string, number>();
    for (const q of quickers) {
      zoneMap.set(q.zone, (zoneMap.get(q.zone) ?? 0) + 1);
    }
    const byZone = [...zoneMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const avgRating = quickers.length
      ? Math.round((quickers.reduce((s, q) => s + q.rating, 0) / quickers.length) * 10) / 10
      : 0;
    const topQuickers = [...quickers].sort((a, b) => b.rating - a.rating).slice(0, 5);

    return {
      revenueMonth,
      revenueMonthDelta: pct(revenueMonth, revenuePrev),
      completedMonth,
      completedDelta: pct(completedMonth, completedPrev),
      activeQuickers,
      avgRating,
      totalClients,
      empresas,
      pendingPayout: pendingPayoutAgg._sum.payout ?? 0,
      paidPayout: paidPayoutAgg._sum.amount ?? 0,
      payrollNet: payrollAgg._sum.netPay ?? 0,
      payrollRuns: payrollAgg._count._all,
      revenueByMonth,
      byStatus,
      byZone,
      topQuickers,
    };
  }
}
