import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CompensationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Pendiente por liquidar de cada quicker: payout de servicios completados sin liquidar. */
  async pendingByQuicker() {
    const quickers = await this.prisma.quicker.findMany({ where: { active: true } });
    const result: {
      quickerId: string;
      name: string;
      zone: string;
      amount: number;
      bookingCount: number;
    }[] = [];
    for (const q of quickers) {
      const bookings = await this.prisma.booking.findMany({
        where: { quickerId: q.userId, status: "completado", payoutId: null },
        select: { payout: true },
      });
      if (bookings.length === 0) {
        continue;
      }
      result.push({
        quickerId: q.id,
        name: q.name,
        zone: q.zone,
        amount: bookings.reduce((s, b) => s + b.payout, 0),
        bookingCount: bookings.length,
      });
    }
    return result;
  }

  /** Genera la cuenta de cobro (Payout pendiente) y enlaza los servicios. Auditado. */
  async liquidate(quickerId: string, actorId: string) {
    const quicker = await this.prisma.quicker.findUnique({ where: { id: quickerId } });
    if (!quicker) {
      throw new NotFoundException("Quicker no encontrado");
    }
    const bookings = await this.prisma.booking.findMany({
      where: { quickerId: quicker.userId, status: "completado", payoutId: null },
      select: { id: true, payout: true, scheduledAt: true },
    });
    if (bookings.length === 0) {
      throw new BadRequestException("No hay servicios pendientes de liquidar");
    }
    const amount = bookings.reduce((s, b) => s + b.payout, 0);
    const dates = bookings.map((b) => b.scheduledAt.getTime());

    const payout = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payout.create({
        data: {
          quickerId,
          amount,
          bookingCount: bookings.length,
          periodFrom: new Date(Math.min(...dates)),
          periodTo: new Date(Math.max(...dates)),
          createdById: actorId,
        },
      });
      await tx.booking.updateMany({
        where: { id: { in: bookings.map((b) => b.id) } },
        data: { payoutId: p.id },
      });
      return p;
    });

    await this.audit.record({
      action: "compensation.liquidate",
      outcome: "success",
      actorId,
      resourceType: "payout",
      resourceId: payout.id,
      metadata: { quickerId, amount, bookingCount: bookings.length },
    });
    return payout;
  }

  /** Marca una liquidación como pagada. Auditado. */
  async markPaid(payoutId: string, actorId: string) {
    const p = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!p) {
      throw new NotFoundException("Liquidación no encontrada");
    }
    if (p.status === "pagado") {
      throw new BadRequestException("La liquidación ya está pagada");
    }
    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: "pagado", paidAt: new Date() },
    });
    await this.audit.record({
      action: "compensation.pay",
      outcome: "success",
      actorId,
      resourceType: "payout",
      resourceId: payoutId,
      metadata: { amount: p.amount },
    });
    return updated;
  }

  history() {
    return this.prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      include: { quicker: { select: { name: true, zone: true } } },
    });
  }
}
