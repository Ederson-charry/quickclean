import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { MetricsService } from "./metrics.service";

describe("MetricsService (integración) — indicadores", () => {
  const prisma = new PrismaService();
  const svc = new MetricsService(prisma);
  const ts = Date.now();
  let categoryId: string;
  let tariffId: string;
  let clientId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const cat = await prisma.serviceCategory.create({
      data: { slug: `met-${ts}`, name: "Met test", iconName: "Sparkles", colorToken: "brand-600" },
    });
    categoryId = cat.id;
    const tariff = await prisma.tariff.create({
      data: { serviceCategoryId: categoryId, name: "v1", effectiveFrom: new Date(Date.now() - 1000), status: "active" },
    });
    tariffId = tariff.id;
    const c = await prisma.user.create({ data: { email: `met-c-${ts}@x.co`, status: "active" } });
    clientId = c.id;
    // dos completados este mes
    for (let i = 0; i < 2; i++) {
      await prisma.booking.create({
        data: {
          clientId, serviceCategoryId: categoryId, tariffId,
          duration: 4, frequency: "unica", size: "M", supplies: false,
          scheduledAt: new Date(), address: "x",
          priceLabor: 80_000, priceTotal: 100_000, payout: 56_000, status: "completado",
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { clientId } });
    await prisma.user.delete({ where: { id: clientId } });
    await prisma.tariff.deleteMany({ where: { serviceCategoryId: categoryId } });
    await prisma.serviceCategory.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("agrega ingresos, completados y series sin reventar", async () => {
    const m = await svc.overview();
    expect(m.revenueMonth).toBeGreaterThanOrEqual(200_000);
    expect(m.completedMonth).toBeGreaterThanOrEqual(2);
    expect(m.revenueByMonth).toHaveLength(6);
    expect(m.activeQuickers).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(m.byStatus)).toBe(true);
    expect(Array.isArray(m.byZone)).toBe(true);
    expect(typeof m.pendingPayout).toBe("number");
  });
});
