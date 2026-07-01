import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, Tariff, TariffComponent, TariffRule } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type ComponentBreakdown,
  type ComponentDef,
  type PayoutConfig,
  type PriceParams,
  type SelectionRef,
  computeComponents,
  rulesToComponents,
} from "./components";
import type { PublishComponentsInput, TariffComponentInput } from "./catalog.schemas";
import type { PriceRule } from "./pricing";

type ComponentInput = Omit<ComponentDef, "durationTable" | "appliesOnRefs"> & {
  durationTable?: Record<string, number> | null;
  appliesOnRefs?: SelectionRef[] | null;
};

/** Mapea componentes al formato de creación de Prisma. */
function componentCreateData(comps: ComponentInput[]): Prisma.TariffComponentCreateWithoutTariffInput[] {
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

/** Fila de Prisma → definición para el motor. */
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

type TariffFull = Tariff & { rules: TariffRule[]; components: TariffComponent[] };

@Injectable()
export class TariffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Tarifa vigente de una categoría (status active). */
  getActive(serviceCategoryId: string): Promise<TariffFull | null> {
    return this.prisma.tariff.findFirst({
      where: { serviceCategoryId, status: "active" },
      orderBy: { effectiveFrom: "desc" },
      include: { rules: true, components: { orderBy: { order: "asc" } } },
    });
  }

  /** Historial de versiones (más reciente primero). */
  history(serviceCategoryId: string): Promise<TariffFull[]> {
    return this.prisma.tariff.findMany({
      where: { serviceCategoryId },
      orderBy: { effectiveFrom: "desc" },
      include: { rules: true, components: { orderBy: { order: "asc" } } },
    });
  }

  /** Componentes + config de pago de la tarifa vigente (para preview/reserva). */
  async activeComponents(serviceCategoryId: string): Promise<{ components: ComponentDef[]; payout: PayoutConfig } | null> {
    const t = await this.getActive(serviceCategoryId);
    if (!t) return null;
    return {
      components: t.components.map(rowToComponent),
      payout: { type: t.payoutType as PayoutConfig["type"], value: t.payoutValue },
    };
  }

  /**
   * Publica una nueva versión de tarifa (modelo de componentes). Si entra en vigor
   * ya, cierra la activa anterior. Versionado puro: nunca se edita una existente.
   */
  async publish(input: PublishComponentsInput, actorId: string): Promise<TariffFull> {
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
      const created = await tx.tariff.create({
        data: {
          serviceCategoryId: input.serviceCategoryId,
          name: input.name,
          effectiveFrom: input.effectiveFrom,
          status,
          publishedBy: actorId,
          publishedAt: now,
          payoutType: input.payoutType,
          payoutValue: input.payoutValue,
          components: { create: componentCreateData(input.components as ComponentInput[]) },
        },
        include: { rules: true, components: { orderBy: { order: "asc" } } },
      });
      return { tariff: created, prevId: goesLiveNow ? prevActive?.id ?? null : null };
    });

    await this.audit.record({
      action: "tariff.publish",
      outcome: "success",
      actorId,
      resourceType: "tariff",
      resourceId: tariff.id,
      before: prevId ? { tariffId: prevId } : null,
      after: { tariffId: tariff.id, status, effectiveFrom: input.effectiveFrom.toISOString() },
      metadata: { serviceCategoryId: input.serviceCategoryId, componentCount: input.components.length },
    });

    return tariff;
  }

  /** Previsualiza el precio con la tarifa vigente (modelo de componentes). */
  async preview(serviceCategoryId: string, params: PriceParams): Promise<ComponentBreakdown> {
    const active = await this.activeComponents(serviceCategoryId);
    if (!active) {
      throw new NotFoundException("La categoría no tiene tarifa vigente");
    }
    return computeComponents(active.components, active.payout, params);
  }

  /** Simula el precio con componentes de borrador (antes de publicar). */
  simulate(components: TariffComponentInput[], payout: PayoutConfig, params: PriceParams): ComponentBreakdown {
    return computeComponents(components as ComponentDef[], payout, params);
  }

  /**
   * Genera componentes para las tarifas que aún no los tienen, derivándolos de sus
   * reglas (retrocompatibilidad). Idempotente. Devuelve cuántas se migraron.
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
  async deactivate(tariffId: string, actorId: string): Promise<TariffFull> {
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
      include: { rules: true, components: { orderBy: { order: "asc" } } },
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
