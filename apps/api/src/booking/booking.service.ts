import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Booking } from "@prisma/client";
import { computePrice } from "../catalog/pricing";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateBookingInput } from "./booking.schemas";

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
      include: { rules: true },
    });
    if (!tariff) {
      throw new BadRequestException("La categoría no tiene tarifa vigente");
    }

    const price = computePrice(tariff.rules, {
      duration: input.duration,
      frequency: input.frequency,
      size: input.size,
      supplies: input.supplies,
    });

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
        priceLabor: price.labor,
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
