import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

export interface Candidate {
  quickerId: string;
  name: string;
  zone: string;
  rating: number;
  hasSkill: boolean;
  load: number;
  zoneMatch: boolean;
  clash: boolean;
  score: number;
  /** Cumple la vinculación requerida por el cliente (empresa ⇒ contrato laboral). */
  eligible: boolean;
  eligibilityReason?: string;
  /** Sin ausencia aprobada que cubra la fecha del servicio. */
  available: boolean;
  unavailableReason?: string;
}

/** Una ausencia [start, end] (días completos) cubre el instante dado. */
function leaveCovers(start: Date, end: Date, when: Date): boolean {
  const endOfLastDay = new Date(end);
  endOfLastDay.setUTCDate(endOfLastDay.getUTCDate() + 1);
  return start.getTime() <= when.getTime() && when.getTime() < endOfLastDay.getTime();
}

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Rankea candidatos para una reserva por idoneidad (asistido, no automático):
   * capacidad/skill por categoría, zona, carga actual, rating y choque de agenda.
   */
  async rankCandidates(bookingId: string): Promise<Candidate[]> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: { include: { clientProfile: true } } },
    });
    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }
    const clientProfile = booking.client?.clientProfile;
    const requiresDirectHire = clientProfile?.requiresDirectHire ?? false;

    const quickers = await this.prisma.quicker.findMany({
      where: { active: true },
      include: { skills: true, leaveRequests: { where: { status: "aprobada" } } },
    });

    const candidates = await Promise.all(
      quickers.map(async (q) => {
        const hasSkill = q.skills.some((s) => s.serviceCategoryId === booking.serviceCategoryId);

        // Regla empresa → empleado directo (§6.3): cliente que exige contratación
        // directa solo admite quickers con contrato laboral activo para ese cliente.
        let eligible = true;
        let eligibilityReason: string | undefined;
        if (requiresDirectHire && clientProfile) {
          const employeeContract = await this.prisma.workContract.findFirst({
            where: {
              quickerId: q.id,
              clientId: clientProfile.id,
              engagementType: "employee",
              status: "activo",
            },
          });
          eligible = employeeContract != null;
          if (!eligible) {
            eligibilityReason = "el cliente exige contrato laboral directo";
          }
        }
        const activeBookings = await this.prisma.booking.findMany({
          where: { quickerId: q.userId, status: { in: ["agendado", "en_curso"] } },
          select: { scheduledAt: true },
        });
        const load = activeBookings.length;
        const clash = activeBookings.some(
          (b) => b.scheduledAt.getTime() === booking.scheduledAt.getTime(),
        );
        const zoneMatch = booking.address.toLowerCase().includes(q.zone.toLowerCase());

        // Disponibilidad: ausencia aprobada que cubra la fecha del servicio (§8.1, agenda).
        const blockingLeave = q.leaveRequests.find((l) =>
          leaveCovers(l.startDate, l.endDate, booking.scheduledAt),
        );
        const available = blockingLeave == null;
        const unavailableReason = blockingLeave
          ? `${blockingLeave.kind} aprobada en esa fecha`
          : undefined;

        const score =
          (hasSkill ? 100 : 0) + q.rating * 4 - load * 12 + (zoneMatch ? 15 : 0) - (clash ? 40 : 0);

        return {
          quickerId: q.id,
          name: q.name,
          zone: q.zone,
          rating: q.rating,
          hasSkill,
          load,
          zoneMatch,
          clash,
          score: Math.round(score * 100) / 100,
          eligible,
          eligibilityReason,
          available,
          unavailableReason,
        };
      }),
    );

    // asignables (elegibles y disponibles) primero, luego por score
    const usable = (c: Candidate) => c.eligible && c.available;
    return candidates.sort((a, b) =>
      usable(a) === usable(b) ? b.score - a.score : usable(a) ? -1 : 1,
    );
  }

  /** Asigna (o reasigna) un quicker a la reserva. Auditado con candidatos vs elegido. */
  async assign(bookingId: string, quickerId: string, actorId: string, reason?: string) {
    const quicker = await this.prisma.quicker.findUnique({ where: { id: quickerId } });
    if (!quicker) {
      throw new NotFoundException("Quicker no encontrado");
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }
    if (booking.status === "completado" || booking.status === "cancelado") {
      throw new BadRequestException("No se puede asignar una reserva finalizada");
    }

    const candidates = await this.rankCandidates(bookingId);
    const chosen = candidates.find((c) => c.quickerId === quickerId);
    if (chosen && !chosen.eligible) {
      throw new BadRequestException(
        "El quicker no cumple la vinculación requerida por el cliente (empresa exige contrato laboral directo)",
      );
    }
    if (chosen && !chosen.available) {
      throw new BadRequestException(
        "El quicker tiene una ausencia aprobada que cubre la fecha del servicio",
      );
    }
    const previousQuickerId = booking.quickerId;

    const assignment = await this.prisma.$transaction(async (tx) => {
      const a = await tx.serviceAssignment.upsert({
        where: { bookingId },
        update: { quickerId, assignedById: actorId, reason, assignedAt: new Date() },
        create: { bookingId, quickerId, assignedById: actorId, reason },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { quickerId: quicker.userId } });
      return a;
    });

    await this.audit.record({
      action: "assignment.create",
      outcome: "success",
      actorId,
      resourceType: "booking",
      resourceId: bookingId,
      before: previousQuickerId ? { quickerUserId: previousQuickerId } : null,
      after: { quickerId, quickerName: quicker.name, reason: reason ?? null },
      metadata: {
        chosen: quickerId,
        candidates: candidates.map((c) => ({ quickerId: c.quickerId, score: c.score })),
      },
    });

    return assignment;
  }

  /** Tablero: reservas activas con su asignación (las sin asignar resaltadas). */
  async board() {
    return this.prisma.booking.findMany({
      where: { status: { in: ["agendado", "en_curso"] } },
      orderBy: { scheduledAt: "asc" },
      include: {
        category: { select: { name: true } },
        client: { select: { email: true } },
        assignment: { include: { quicker: { select: { name: true, zone: true } } } },
      },
    });
  }
}
