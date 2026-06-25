import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface ReconciliationItem {
  bookingId: string;
  scheduledAt: Date;
  client: string | null;
  service: string | null;
  quicker: string | null;
  cobro: number; // lo que paga el cliente (priceTotal)
  pago: number; // lo que recibe el quicker (payout)
  comision: number; // margen de plataforma (cobro − pago)
  liquidacion: "liquidado" | "pendiente"; // estado del pago al quicker
}

export interface ReconciliationReport {
  from: string | null;
  to: string | null;
  summary: { count: number; totalCobro: number; totalPago: number; totalComision: number };
  items: ReconciliationItem[];
}

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte de conciliación para GAF/ERP: por cada servicio completado, el cobro
   * al cliente, el pago al quicker y la comisión de plataforma. Insumo para que
   * el ERP registre facturación y novedades de nómina (QuickClean no las emite).
   */
  async report(from?: Date, to?: Date): Promise<ReconciliationReport> {
    const where: Prisma.BookingWhereInput = { status: "completado" };
    if (from || to) {
      where.scheduledAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
    }
    const bookings = await this.prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: {
        category: { select: { name: true } },
        client: { select: { email: true } },
        quicker: { select: { email: true, quickerProfile: { select: { name: true } } } },
      },
    });

    const items: ReconciliationItem[] = bookings.map((b) => ({
      bookingId: b.id,
      scheduledAt: b.scheduledAt,
      client: b.client?.email ?? null,
      service: b.category?.name ?? null,
      quicker: b.quicker?.quickerProfile?.name ?? b.quicker?.email ?? null,
      cobro: b.priceTotal,
      pago: b.payout,
      comision: b.priceTotal - b.payout,
      liquidacion: b.payoutId ? "liquidado" : "pendiente",
    }));

    return {
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
      summary: {
        count: items.length,
        totalCobro: items.reduce((s, i) => s + i.cobro, 0),
        totalPago: items.reduce((s, i) => s + i.pago, 0),
        totalComision: items.reduce((s, i) => s + i.comision, 0),
      },
      items,
    };
  }
}

const COLUMNS = ["scheduledAt", "client", "service", "quicker", "cobro", "pago", "comision", "liquidacion"] as const;

function cell(value: unknown): string {
  const s = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serializa los ítems de conciliación a CSV (para el ERP). */
export function reconciliationToCsv(items: ReconciliationItem[]): string {
  const header = COLUMNS.join(",");
  const lines = items.map((r) =>
    COLUMNS.map((c) => cell((r as unknown as Record<string, unknown>)[c])).join(","),
  );
  return [header, ...lines].join("\n");
}
