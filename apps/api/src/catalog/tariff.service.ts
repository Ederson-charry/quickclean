import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Tariff, TariffRule } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import type { ComponentDef } from "./components";
import { rulesToComponents } from "./components";
import type { PriceRule } from "./pricing";
import type { PublishTariffInput } from "./catalog.schemas";
import { type PriceBreakdown, type PriceInput, computePrice } from "./pricing";

/** Mapea componentes al formato de creación de Prisma. */
function componentCreateData(comps: ComponentDef[]): Prisma.TariffComponentCreateWithoutTariffInput[] {
  return comps.map((c) => ({
    order: c.order,
    code: c.code,
    label: c.label,
    nature: c.nature,
    valueType: c.valueType,
    value: c.value,
    durationTable: (c.durationTable ?? undefined) as Prisma.InputJsonValue | undefined,
    appliesOn: c.appliesOn,
    appliesOnRefs: (c.appliesOnRefs ?? undefined) as Prisma.InputJsonValue | undefined,
    condParam: c.condParam ?? null,
    condValue: c.condValue ?? null,
    countsForPayout: c.countsForPayout,
    visibleToClient: c.visibleToClient,
  }));
}

type TariffWithRules = Tariff & { rules: TariffRule[] };

@Injectable()
export class TariffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Tarifa vigente de una categoría (status active). */
  getActive(serviceCategoryId: string): Promise<TariffWithRules | null> {
    return this.prisma.tariff.findFirst({
      where: { serviceCategoryId, status: "active" },
      orderBy: { effectiveFrom: "desc" },
      include: { rules: true, components: { orderBy: { order: "asc" } } },
    });
  }

  /** Historial de versiones (más reciente primero). */
  history(serviceCategoryId: string): Promise<TariffWithRules[]> {
    return this.prisma.tariff.findMany({
      where: { serviceCategoryId },
      orderBy: { effectiveFrom: "desc" },
      include: { rules: true, components: { orderBy: { order: "asc" } } },
    });
  }

  /**
   * Publica una nueva versión de tarifa. Si entra en vigor ya (effectiveFrom <= ahora),
   * cierra la activa anterior (effectiveTo + status expired). Cada publicación se audita.
   * Versionado puro: nunca se edita una tarifa existente.
   */
  async publish(input: PublishTariffInput, actorId: string): Promise<TariffWithRules> {
    const now = new Date();
    const goesLiveNow = input.effectiveFrom.getTime() <= now.getTime();
    const status = goesLiveNow ? "active" : "scheduled";

    const { tariff, prevId } = await this.prisma.$transaction(async (tx) => {
      const prevActive = await tx.tariff.findFirst({
        where: { serviceCategoryId: input.serviceCategoryId, status: "active" },
        orderBy: { effectiveFrom: "desc" },
      });
      if (prevActive && goesLiveNow) {
        await tx.tariff.update({
          where: { id: prevActive.id },
          data: { effectiveTo: input.effectiveFrom, status: "expired" },
        });
      }
      // Modelo nuevo: derivar componentes + pago desde las reglas recibidas.
      const { components, payout } = rulesToComponents(input.rules as PriceRule[]);
      const created = await tx.tariff.create({
        data: {
          serviceCategoryId: input.serviceCategoryId,
          name: input.name,
          effectiveFrom: input.effectiveFrom,
          status,
          publishedBy: actorId,
          publishedAt: now,
          payoutType: payout.type,
          payoutValue: payout.value,
          rules: {
            create: input.rules.map((r) => ({
              dimension: r.dimension,
              key: r.key,
              modifierType: r.modifierType,
              value: r.value,
            })),
          },
          components: { create: componentCreateData(components) },
        },
        include: { rules: true },
      });
      return { tariff: created, prevId: goesLiveNow ? prevActive?.id ?? null : null };
    });

    // auditoría de la publicación (fuera de la tx; el AuditService usa su propia tx encadenada)
    await this.audit.record({
      action: "tariff.publish",
      outcome: "success",
      actorId,
      resourceType: "tariff",
      resourceId: tariff.id,
      before: prevId ? { tariffId: prevId } : null,
      after: { tariffId: tariff.id, status, effectiveFrom: input.effectiveFrom.toISOString() },
      metadata: { serviceCategoryId: input.serviceCategoryId, ruleCount: input.rules.length },
    });

    return tariff;
  }

  /** Previsualiza el precio con la tarifa vigente de la categoría. */
  async preview(serviceCategoryId: string, input: PriceInput): Promise<PriceBreakdown> {
    const tariff = await this.getActive(serviceCategoryId);
    if (!tariff) {
      throw new NotFoundException("La categoría no tiene tarifa vigente");
    }
    return computePrice(tariff.rules, input);
  }

  /** Simula el precio con un conjunto de reglas de borrador (antes de publicar). */
  simulate(rules: PriceRule[], input: PriceInput): PriceBreakdown {
    return computePrice(rules, input);
  }

  /**
   * Genera los componentes (modelo nuevo) para las tarifas que aún no los tienen,
   * derivándolos de sus reglas. Idempotente. Devuelve cuántas tarifas se migraron.
   */
  async backfillComponents(): Promise<{ migrated: number }> {
    const tariffs = await this.prisma.tariff.findMany({
      where: { components: { none: {} } },
      include: { rules: true },
    });
    let migrated = 0;
    for (const t of tariffs) {
      if (t.rules.length === 0) continue;
      const { components, payout } = rulesToComponents(t.rules as unknown as PriceRule[]);
      await this.prisma.$transaction(async (tx) => {
        await tx.tariff.update({
          where: { id: t.id },
          data: { payoutType: payout.type, payoutValue: payout.value },
        });
        await tx.tariffComponent.createMany({
          data: componentCreateData(components).map((c) => ({ ...c, tariffId: t.id })),
        });
      });
      migrated++;
    }
    return { migrated };
  }

  /** Desactiva una tarifa vigente/programada (status expired + cierra vigencia). Auditado. */
  async deactivate(tariffId: string, actorId: string): Promise<TariffWithRules> {
    const tariff = await this.prisma.tariff.findUnique({ where: { id: tariffId } });
    if (!tariff) {
      throw new NotFoundException("Tarifa no encontrada");
    }
    if (tariff.status === "expired") {
      throw new BadRequestException("La tarifa ya está desactivada");
    }
    const updated = await this.prisma.tariff.update({
      where: { id: tariffId },
      data: { status: "expired", effectiveTo: new Date() },
      include: { rules: true },
    });
    await this.audit.record({
      action: "tariff.deactivate",
      outcome: "success",
      actorId,
      resourceType: "tariff",
      resourceId: tariffId,
      before: { status: tariff.status },
      after: { status: "expired" },
    });
    return updated;
  }
}
