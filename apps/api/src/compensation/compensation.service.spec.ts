import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CompensationService } from "./compensation.service";

describe("CompensationService (integración)", () => {
  const prisma = new PrismaService();
  const svc = new CompensationService(prisma, new AuditService(prisma));
  let categoryId: string;
  let tariffId: string;
  let clientId: string;
  let quickerUserId: string;
  let quickerId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const cat = await prisma.serviceCategory.create({
      data: { slug: `cmp-${Date.now()}`, name: "Comp test", iconName: "Sparkles", colorToken: "brand-600" },
    });
    categoryId = cat.id;
    const tariff = await prisma.tariff.create({
      data: {
        serviceCategoryId: categoryId, name: "v1", effectiveFrom: new Date(Date.now() - 1000), status: "active",
        rules: { create: [{ dimension: "duration", key: "4", modifierType: "base", value: 80_000 }] },
      },
    });
    tariffId = tariff.id;
    const client = await prisma.user.create({ data: { email: `cmpc-${Date.now()}@x.co`, status: "active" } });
    clientId = client.id;
    const u = await prisma.user.create({ data: { email: `cmpq-${Date.now()}@x.co`, status: "active" } });
    quickerUserId = u.id;
    const q = await prisma.quicker.create({ data: { userId: u.id, name: "Comp Quicker", zone: "Centro", rating: 4.8 } });
    quickerId = q.id;
    // dos servicios completados asignados al quicker (payout 50000 c/u)
    for (let i = 0; i < 2; i++) {
      await prisma.booking.create({
        data: {
          clientId, serviceCategoryId: categoryId, tariffId, quickerId: quickerUserId,
          duration: 4, frequency: "unica", size: "S", supplies: false,
          scheduledAt: new Date(Date.now() - i * 86_400_000), address: "x",
          priceLabor: 80_000, priceTotal: 86_900, payout: 50_000, status: "completado",
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { clientId } });
    await prisma.payout.deleteMany({ where: { quickerId } });
    await prisma.quicker.delete({ where: { id: quickerId } });
    await prisma.user.deleteMany({ where: { id: { in: [clientId, quickerUserId] } } });
    await prisma.tariff.deleteMany({ where: { serviceCategoryId: categoryId } });
    await prisma.serviceCategory.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("calcula el pendiente por quicker (suma de payouts completados sin liquidar)", async () => {
    const pending = await svc.pendingByQuicker();
    const mine = pending.find((p) => p.quickerId === quickerId);
    expect(mine?.amount).toBe(100_000);
    expect(mine?.bookingCount).toBe(2);
  });

  it("liquida: crea Payout pendiente, enlaza los servicios y deja el pendiente en 0", async () => {
    const payout = await svc.liquidate(quickerId, clientId);
    expect(payout.amount).toBe(100_000);
    expect(payout.status).toBe("pendiente");
    const pending = await svc.pendingByQuicker();
    expect(pending.find((p) => p.quickerId === quickerId)).toBeUndefined();
  });

  it("marca pagado y rechaza pagar dos veces", async () => {
    const last = (await svc.history()).find((p) => p.quickerId === quickerId)!;
    const paid = await svc.markPaid(last.id, clientId);
    expect(paid.status).toBe("pagado");
    expect(paid.paidAt).not.toBeNull();
    await expect(svc.markPaid(last.id, clientId)).rejects.toThrow();
  });
});
