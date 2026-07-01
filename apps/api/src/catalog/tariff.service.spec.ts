import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "./catalog.service";
import { PublishComponentsInput, type TariffComponentInput } from "./catalog.schemas";
import type { PayoutConfig } from "./components";
import { TariffService } from "./tariff.service";

describe("TariffService (integración) — versionado", () => {
  const prisma = new PrismaService();
  const tariffs = new TariffService(prisma, new AuditService(prisma));
  const catalog = new CatalogService(prisma);
  let categoryId: string;

  // Base $80.000 (por 4h) + comisión fija $6.900 que no cuenta para el pago.
  const components: TariffComponentInput[] = [
    {
      code: "base",
      order: 0,
      label: "Tarifa base",
      nature: "base",
      valueType: "table",
      value: 0,
      durationTable: { "4": 80_000 },
      appliesOn: "base",
      countsForPayout: true,
      visibleToClient: true,
    },
    {
      code: "comision",
      order: 1,
      label: "Comisión de plataforma",
      nature: "cost",
      valueType: "fixed",
      value: 6_900,
      appliesOn: "base",
      countsForPayout: false,
      visibleToClient: true,
    },
  ];
  const payout: PayoutConfig = { type: "percent", value: 0.7 };
  const input = (name: string, effectiveFrom: Date) =>
    PublishComponentsInput.parse({
      serviceCategoryId: categoryId,
      name,
      effectiveFrom,
      payoutType: payout.type,
      payoutValue: payout.value,
      components,
    });

  beforeAll(async () => {
    await prisma.onModuleInit();
    const c = await catalog.create({
      slug: `test-cat-${Date.now()}`,
      name: "Test cat",
      iconName: "Sparkles",
      colorToken: "brand-600",
    });
    categoryId = c.id;
  });

  afterAll(async () => {
    await prisma.tariff.deleteMany({ where: { serviceCategoryId: categoryId } });
    await prisma.serviceCategory.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("publica v1 como activa", async () => {
    const v1 = await tariffs.publish(input("v1", new Date(Date.now() - 1000)), "admin1");
    expect(v1.status).toBe("active");
    expect(v1.components.length).toBe(2);
    expect((await tariffs.getActive(categoryId))?.id).toBe(v1.id);
  });

  it("publicar v2 cierra v1 (expired + effectiveTo) y deja v2 vigente", async () => {
    const from = new Date();
    const v2 = await tariffs.publish(input("v2", from), "admin1");
    expect(v2.status).toBe("active");
    expect((await tariffs.getActive(categoryId))?.id).toBe(v2.id);

    const history = await tariffs.history(categoryId);
    expect(history.length).toBe(2);
    const v1 = history.find((t) => t.name === "v1");
    expect(v1?.status).toBe("expired");
    expect(v1?.effectiveTo).not.toBeNull();
  });

  it("preview calcula con la tarifa vigente", async () => {
    const p = await tariffs.preview(categoryId, { duration: 4, frequency: "unica", size: "S", supplies: false });
    expect(p.total).toBe(80_000 + 6_900);
  });

  it("simulate calcula con componentes de borrador (sin publicar) e incluye recargo festivo", async () => {
    // Base $100.000 + comisión $5.000 + recargo festivo 30% sobre subtotal.
    const draft: TariffComponentInput[] = [
      {
        code: "base",
        order: 0,
        label: "Tarifa base",
        nature: "base",
        valueType: "table",
        value: 0,
        durationTable: { "4": 100_000 },
        appliesOn: "base",
        countsForPayout: true,
        visibleToClient: true,
      },
      {
        code: "festivo",
        order: 1,
        label: "Recargo festivo",
        nature: "cost",
        valueType: "percent",
        value: 0.3,
        appliesOn: "subtotal",
        condParam: "holiday",
        condValue: "true",
        countsForPayout: true,
        visibleToClient: true,
      },
      {
        code: "comision",
        order: 2,
        label: "Comisión",
        nature: "cost",
        valueType: "fixed",
        value: 5_000,
        appliesOn: "base",
        countsForPayout: false,
        visibleToClient: true,
      },
    ];
    const normal = tariffs.simulate(draft, payout, { duration: 4, frequency: "unica", size: "S", supplies: false });
    expect(normal.total).toBe(100_000 + 5_000);
    const festivo = tariffs.simulate(draft, payout, { duration: 4, frequency: "unica", size: "S", supplies: false, holiday: true });
    const surcharge = festivo.lines.find((l) => l.code === "festivo");
    expect(surcharge?.amount).toBe(30_000);
    expect(festivo.total).toBe(100_000 + 5_000 + 30_000);
  });

  it("desactiva la tarifa vigente (expired) y bloquea desactivar dos veces", async () => {
    const active = await tariffs.getActive(categoryId);
    const off = await tariffs.deactivate(active!.id, "admin1");
    expect(off.status).toBe("expired");
    expect(off.effectiveTo).not.toBeNull();
    await expect(tariffs.deactivate(active!.id, "admin1")).rejects.toThrow();
  });
});
