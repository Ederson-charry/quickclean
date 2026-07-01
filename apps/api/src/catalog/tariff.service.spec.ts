import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "./catalog.service";
import { PublishTariffInput } from "./catalog.schemas";
import { TariffService } from "./tariff.service";

describe("TariffService (integración) — versionado", () => {
  const prisma = new PrismaService();
  const tariffs = new TariffService(prisma, new AuditService(prisma));
  const catalog = new CatalogService(prisma);
  let categoryId: string;

  const rules = [
    { dimension: "duration", key: "4", modifierType: "base", value: 80_000 },
    { dimension: "platform_fee", key: "", modifierType: "flat", value: 6_900 },
  ];
  const input = (name: string, effectiveFrom: Date) =>
    PublishTariffInput.parse({ serviceCategoryId: categoryId, name, effectiveFrom, rules });

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

  it("simulate calcula con reglas de borrador (sin publicar) e incluye recargo festivo", async () => {
    const draft = [
      { dimension: "duration", key: "4", modifierType: "base", value: 100_000 },
      { dimension: "platform_fee", key: "", modifierType: "flat", value: 5_000 },
      { dimension: "holiday", key: "", modifierType: "percent", value: 0.3 },
    ];
    const normal = tariffs.simulate(draft, { duration: 4, frequency: "unica", size: "S", supplies: false });
    expect(normal.total).toBe(100_000 + 5_000);
    const festivo = tariffs.simulate(draft, { duration: 4, frequency: "unica", size: "S", supplies: false, holiday: true });
    expect(festivo.holidaySurcharge).toBe(30_000);
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
