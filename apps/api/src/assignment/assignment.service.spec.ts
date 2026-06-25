import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { AssignmentService } from "./assignment.service";

describe("AssignmentService (integración) — ranking + asignación", () => {
  const prisma = new PrismaService();
  const svc = new AssignmentService(prisma, new AuditService(prisma));
  let categoryId: string;
  let tariffId: string;
  let clientId: string;
  let bookingId: string;
  let skilledUserId: string;
  let skilledQuickerId: string;
  let plainQuickerId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    await prisma.onModuleInit();
    const cat = await prisma.serviceCategory.create({
      data: { slug: `asg-${Date.now()}`, name: "Asig test", iconName: "Sparkles", colorToken: "brand-600" },
    });
    categoryId = cat.id;
    const tariff = await prisma.tariff.create({
      data: {
        serviceCategoryId: categoryId, name: "v1", effectiveFrom: new Date(Date.now() - 1000), status: "active",
        rules: { create: [{ dimension: "duration", key: "4", modifierType: "base", value: 80_000 }] },
      },
    });
    tariffId = tariff.id;
    const client = await prisma.user.create({ data: { email: `c-${Date.now()}@x.co`, status: "active" } });
    clientId = client.id;
    userIds.push(client.id);
    const booking = await prisma.booking.create({
      data: {
        clientId, serviceCategoryId: categoryId, tariffId, duration: 4, frequency: "unica", size: "S",
        supplies: false, scheduledAt: new Date(Date.now() + 86_400_000), address: "Calle Chapinero",
        priceLabor: 80_000, priceTotal: 86_900, payout: 56_000, status: "agendado",
      },
    });
    bookingId = booking.id;

    // quicker CON skill (Chapinero, rating alto)
    const uSkilled = await prisma.user.create({ data: { email: `qs-${Date.now()}@x.co`, status: "active" } });
    skilledUserId = uSkilled.id;
    userIds.push(uSkilled.id);
    const qSkilled = await prisma.quicker.create({
      data: { userId: uSkilled.id, name: "Skilled", zone: "Chapinero", rating: 4.9 },
    });
    skilledQuickerId = qSkilled.id;
    await prisma.quickerSkill.create({ data: { quickerId: qSkilled.id, serviceCategoryId: categoryId } });

    // quicker SIN skill
    const uPlain = await prisma.user.create({ data: { email: `qp-${Date.now()}@x.co`, status: "active" } });
    userIds.push(uPlain.id);
    const qPlain = await prisma.quicker.create({
      data: { userId: uPlain.id, name: "Plain", zone: "Suba", rating: 4.5 },
    });
    plainQuickerId = qPlain.id;
  });

  afterAll(async () => {
    await prisma.serviceAssignment.deleteMany({ where: { bookingId } });
    await prisma.booking.deleteMany({ where: { clientId } });
    await prisma.quicker.deleteMany({ where: { id: { in: [skilledQuickerId, plainQuickerId] } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.tariff.deleteMany({ where: { serviceCategoryId: categoryId } });
    await prisma.serviceCategory.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("rankea más alto al quicker con skill para la categoría", async () => {
    const ranked = await svc.rankCandidates(bookingId);
    expect(ranked[0].quickerId).toBe(skilledQuickerId);
    expect(ranked[0].hasSkill).toBe(true);
    expect(ranked[0].score).toBeGreaterThan(ranked[ranked.length - 1].score);
  });

  it("asigna: setea booking.quickerId, crea ServiceAssignment y audita", async () => {
    await svc.assign(bookingId, skilledQuickerId, clientId, "idóneo por skill y zona");
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking?.quickerId).toBe(skilledUserId);
    const assignment = await prisma.serviceAssignment.findUnique({ where: { bookingId } });
    expect(assignment?.quickerId).toBe(skilledQuickerId);
  });

  it("reasigna sobre la misma reserva (upsert)", async () => {
    await svc.assign(bookingId, plainQuickerId, clientId, "reasignación");
    const assignment = await prisma.serviceAssignment.findUnique({ where: { bookingId } });
    expect(assignment?.quickerId).toBe(plainQuickerId);
  });
});
