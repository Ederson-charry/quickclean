import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Booking, TariffComponent } from "@prisma/client";
import { type ComponentDef, type SelectionRef, computeComponents } from "../catalog/components";
import { isColombianHoliday } from "../catalog/holidays";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateBookingInput } from "./booking.schemas";

const copFmt = (n: number): string => `$${n.toLocaleString("es-CO")}`;

/** Fila de componente de Prisma → definición para el motor. */
function rowToComponent(c: TariffComponent): ComponentDef {
  return {
    code: c.code,
    order: c.order,
    label: c.label,
    nature: c.nature as ComponentDef["nature"],
    valueType: c.valueType as ComponentDef["valueType"],
    value: c.value,
    durationTable: (c.durationTable as Record<string, number> | null) ?? undefined,
    appliesOn: c.appliesOn as ComponentDef["appliesOn"],
    appliesOnRefs: (c.appliesOnRefs as SelectionRef[] | null) ?? undefined,
    condParam: c.condParam,
    condValue: c.condValue,
    countsForPayout: c.countsForPayout,
    visibleToClient: c.visibleToClient,
  };
}

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Crea una reserva calculando el precio con la tarifa vigente y guardando
   * snapshot de tariffId + precio: aunque la tarifa cambie luego, la reserva
   * conserva su valor.
   */
  async create(clientId: string, input: CreateBookingInput): Promise<Booking> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: input.serviceCategoryId },
    });
    if (!category || category.archivedAt || !category.active) {
      throw new BadRequestException("Categoría de servicio no disponible");
    }
    const tariff = await this.prisma.tariff.findFirst({
      where: { serviceCategoryId: input.serviceCategoryId, status: "active" },
      orderBy: { effectiveFrom: "desc" },
      include: { components: { orderBy: { order: "asc" } } },
    });
    if (!tariff || tariff.components.length === 0) {
      throw new BadRequestException("La categoría no tiene tarifa vigente");
    }

    const price = computeComponents(
      tariff.components.map(rowToComponent),
      { type: tariff.payoutType as "percent" | "fixed", value: tariff.payoutValue },
      {
        duration: input.duration,
        frequency: input.frequency,
        size: input.size,
        supplies: input.supplies,
        holiday: isColombianHoliday(input.scheduledAt),
      },
    );

    const booking = await this.prisma.booking.create({
      data: {
        clientId,
        serviceCategoryId: input.serviceCategoryId,
        tariffId: tariff.id,
        duration: input.duration,
        frequency: input.frequency,
        size: input.size,
        supplies: input.supplies,
        scheduledAt: input.scheduledAt,
        address: input.address,
        notes: input.notes,
        pets: input.pets ?? false,
        priceLabor: price.payoutBase,
        priceTotal: price.total,
        payout: price.payout,
      },
    });

    await this.audit.record({
      action: "booking.create",
      outcome: "success",
      actorId: clientId,
      resourceType: "booking",
      resourceId: booking.id,
      metadata: { serviceCategoryId: input.serviceCategoryId, tariffId: tariff.id, total: price.total },
    });

    // Confirmación al cliente (best-effort: no bloquea la reserva si falla).
    const client = await this.prisma.user.findUnique({ where: { id: clientId }, select: { email: true } });
    if (client) {
      const when = booking.scheduledAt.toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" });
      await this.notifications
        .send({
          userId: clientId,
          to: client.email,
          kind: "booking_confirmed",
          subject: `Reserva confirmada: ${category.name}`,
          body:
            `Tu reserva de ${category.name} quedó confirmada.\n` +
            `Fecha: ${when}\nDirección: ${input.address}\nTotal: ${copFmt(price.total)}\n\n` +
            "Te avisaremos cuando se asigne tu profesional.",
        })
        .catch(() => undefined);
    }

    return booking;
  }

  listForClient(clientId: string) {
    return this.prisma.booking.findMany({
      where: { clientId },
      orderBy: { scheduledAt: "desc" },
      include: { category: { select: { name: true, slug: true, iconName: true } } },
    });
  }

  get(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: { category: { select: { name: true, slug: true, iconName: true } } },
    });
  }

  /** Balance del quicker: lo ganado por sus servicios completados, por estado de pago. */
  async quickerBalance(quickerUserId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { quickerId: quickerUserId, status: "completado" },
      orderBy: { scheduledAt: "desc" },
      include: {
        category: { select: { name: true } },
        payoutLiquidation: { select: { status: true } },
      },
    });

    let porLiquidar = 0;
    let porPagar = 0;
    let pagado = 0;
    const movements = bookings.map((b) => {
      let estado: "por_liquidar" | "por_pagar" | "pagado";
      if (!b.payoutId) {
        porLiquidar += b.payout;
        estado = "por_liquidar";
      } else if (b.payoutLiquidation?.status === "pagado") {
        pagado += b.payout;
        estado = "pagado";
      } else {
        porPagar += b.payout;
        estado = "por_pagar";
      }
      return { id: b.id, date: b.scheduledAt, service: b.category?.name ?? null, amount: b.payout, estado };
    });

    return {
      servicios: bookings.length,
      porLiquidar,
      porPagar,
      pagado,
      disponible: porLiquidar + porPagar,
      total: porLiquidar + porPagar + pagado,
      movements,
    };
  }

  /** Reservas activas asignadas a un quicker (su panel "Hoy"). */
  listForQuicker(quickerUserId: string) {
    return this.prisma.booking.findMany({
      where: { quickerId: quickerUserId, status: { in: ["agendado", "en_curso"] } },
      orderBy: { scheduledAt: "asc" },
      include: { category: { select: { name: true } }, client: { select: { email: true } } },
    });
  }

  listAll(filter: { status?: string }) {
    return this.prisma.booking.findMany({
      where: filter.status ? { status: filter.status as Booking["status"] } : {},
      orderBy: { scheduledAt: "desc" },
      take: 100,
      include: {
        category: { select: { name: true } },
        client: { select: { email: true } },
      },
    });
  }

  /** Transiciones de estado permitidas. */
  private static readonly NEXT: Record<string, string[]> = {
    agendado: ["en_curso", "cancelado"],
    en_curso: ["completado", "cancelado"],
    completado: [],
    cancelado: [],
  };

  /** Cambia el estado de una reserva validando la transición. Auditado. */
  async transition(id: string, to: Booking["status"], actorId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }
    if (!BookingService.NEXT[booking.status]?.includes(to)) {
      throw new BadRequestException(`Transición no permitida: ${booking.status} → ${to}`);
    }
    const updated = await this.prisma.booking.update({ where: { id }, data: { status: to } });
    await this.audit.record({
      action: "booking.status",
      outcome: "success",
      actorId,
      resourceType: "booking",
      resourceId: id,
      before: { status: booking.status },
      after: { status: to },
    });
    return updated;
  }

  /** El cliente califica una reserva completada (1-5 + comentario). Auditado. */
  async rate(id: string, clientId: string, rating: number, comment: string | undefined): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.clientId !== clientId) {
      throw new NotFoundException("Reserva no encontrada");
    }
    if (booking.status !== "completado") {
      throw new BadRequestException("Solo se califican servicios completados");
    }
    if (booking.ratedAt) {
      throw new BadRequestException("Esta reserva ya fue calificada");
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { rating, ratingComment: comment, ratedAt: new Date() },
    });
    await this.audit.record({
      action: "booking.rate",
      outcome: "success",
      actorId: clientId,
      resourceType: "booking",
      resourceId: id,
      metadata: { rating },
    });
    return updated;
  }

  async cancel(id: string, actorId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }
    if (booking.status === "completado") {
      throw new BadRequestException("No se puede cancelar una reserva completada");
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: "cancelado" },
    });
    await this.audit.record({
      action: "booking.cancel",
      outcome: "success",
      actorId,
      resourceType: "booking",
      resourceId: id,
    });
    return updated;
  }
}
