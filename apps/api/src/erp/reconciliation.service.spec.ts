import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { ReconciliationService, reconciliationToCsv } from "./reconciliation.service";

describe("ReconciliationService (integración)", () => {
  const prisma = new PrismaService();
  const svc = new ReconciliationService(prisma);
  let categoryId: string;
  let tariffId: string;
  let clientId: string;
  const from = new Date("2099-01-01T00:00:00Z");
  const to = new Date("2099-12-31T00:00:00Z");

  beforeAll(async () => {
    await prisma.onModuleInit();
    const cat = await prisma.serviceCategory.create({
      data: { slug: `erp-${Date.now()}`, name: "ERP test", iconName: "Sparkles", colorToken: "brand-600" },
    });
    categoryId = cat.id;
    const tariff = await prisma.tariff.create({
      data: {
        serviceCategoryId: categoryId, name: "v1", effectiveFrom: new Date(Date.now() - 1000), status: "active",
        rules: { create: [{ dimension: "duration", key: "4", modifierType: "base", value: 80_000 }] },
      },
    });
    tariffId = tariff.id;
    const client = await prisma.user.create({ data: { email: `erpc-${Date.now()}@x.co`, status: "active" } });
    clientId = client.id;
    for (let i = 0; i < 2; i++) {
      await prisma.booking.create({
        data: {
          clientId, serviceCategoryId: categoryId, tariffId,
          duration: 4, frequency: "unica", size: "S", supplies: false,
          scheduledAt: new Date("2099-06-15T10:00:00Z"), address: "x",
          priceLabor: 80_000, priceTotal: 86_900, payout: 50_000, status: "completado",
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { clientId } });
    await prisma.tariff.deleteMany({ where: { serviceCategoryId: categoryId } });
    await prisma.serviceCategory.delete({ where: { id: categoryId } });
    await prisma.user.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("agrega cobro, pago y comisión por periodo", async () => {
    const report = await svc.report(from, to);
    expect(report.summary.count).toBe(2);
    expect(report.summary.totalCobro).toBe(173_800);
    expect(report.summary.totalPago).toBe(100_000);
    expect(report.summary.totalComision).toBe(73_800);
  });

  it("genera CSV con cabecera y filas", async () => {
    const report = await svc.report(from, to);
    const csv = reconciliationToCsv(report.items);
    expect(csv.split("\n")[0]).toContain("cobro,pago,comision");
    expect(csv.split("\n").length).toBe(3); // header + 2 filas
  });
});
