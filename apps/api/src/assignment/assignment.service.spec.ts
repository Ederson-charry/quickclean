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

  it("regla empresa→empleado: solo el quicker con contrato laboral es elegible", async () => {
    // cliente empresa que exige contratación directa
    const empUser = await prisma.user.create({ data: { email: `emp-${Date.now()}@x.co`, status: "active" } });
    const empClient = await prisma.client.create({
      data: { userId: empUser.id, name: "Empresa X", kind: "empresa", requiresDirectHire: true },
    });
    const empBooking = await prisma.booking.create({
      data: {
        clientId: empUser.id, serviceCategoryId: categoryId, tariffId,
        duration: 4, frequency: "unica", size: "S", supplies: false,
        scheduledAt: new Date(Date.now() + 2 * 86_400_000), address: "Calle Empresa",
        priceLabor: 80_000, priceTotal: 86_900, payout: 56_000, status: "agendado",
      },
    });
    // solo el skilled tiene contrato laboral con la empresa
    await prisma.workContract.create({
      data: { quickerId: skilledQuickerId, clientId: empClient.id, engagementType: "employee", status: "activo" },
    });

    const ranked = await svc.rankCandidates(empBooking.id);
    const skilled = ranked.find((c) => c.quickerId === skilledQuickerId)!;
    const plain = ranked.find((c) => c.quickerId === plainQuickerId)!;
    expect(skilled.eligible).toBe(true);
    expect(plain.eligible).toBe(false);
    // elegibles primero
    expect(ranked[0].quickerId).toBe(skilledQuickerId);
    // asignar un no-elegible debe fallar
    await expect(svc.assign(empBooking.id, plainQuickerId, clientId)).rejects.toThrow();
    // asignar al elegible funciona
    const ok = await svc.assign(empBooking.id, skilledQuickerId, clientId);
    expect(ok.quickerId).toBe(skilledQuickerId);

    // limpieza local
    await prisma.serviceAssignment.deleteMany({ where: { bookingId: empBooking.id } });
    await prisma.booking.delete({ where: { id: empBooking.id } });
    await prisma.workContract.deleteMany({ where: { clientId: empClient.id } });
    await prisma.client.delete({ where: { id: empClient.id } });
    await prisma.user.delete({ where: { id: empUser.id } });
  });

  it("disponibilidad: una ausencia aprobada que cubre la fecha deja al quicker no asignable", async () => {
    // servicio en una fecha fija; el skilled tiene incapacidad aprobada que la cubre
    const day = new Date("2026-09-10T14:00:00.000Z");
    const leaveBooking = await prisma.booking.create({
      data: {
        clientId, serviceCategoryId: categoryId, tariffId,
        duration: 4, frequency: "unica", size: "S", supplies: false,
        scheduledAt: day, address: "Calle Chapinero",
        priceLabor: 80_000, priceTotal: 86_900, payout: 56_000, status: "agendado",
      },
    });
    await prisma.leaveRequest.create({
      data: {
        quickerId: skilledQuickerId, kind: "incapacidad",
        startDate: new Date("2026-09-09T00:00:00.000Z"),
        endDate: new Date("2026-09-11T00:00:00.000Z"),
        status: "aprobada",
      },
    });

    const ranked = await svc.rankCandidates(leaveBooking.id);
    const skilled = ranked.find((c) => c.quickerId === skilledQuickerId)!;
    const plain = ranked.find((c) => c.quickerId === plainQuickerId)!;
    expect(skilled.available).toBe(false);
    expect(skilled.unavailableReason).toContain("incapacidad");
    expect(plain.available).toBe(true);
    // aunque tenga más score por skill, el no-disponible queda detrás del disponible
    const idxPlain = ranked.findIndex((c) => c.quickerId === plainQuickerId);
    const idxSkilled = ranked.findIndex((c) => c.quickerId === skilledQuickerId);
    expect(idxPlain).toBeLessThan(idxSkilled);
    // asignar al no-disponible falla
    await expect(svc.assign(leaveBooking.id, skilledQuickerId, clientId)).rejects.toThrow();

    // una solicitud solo en revisión NO bloquea
    const pendingBooking = await prisma.booking.create({
      data: {
        clientId, serviceCategoryId: categoryId, tariffId,
        duration: 4, frequency: "unica", size: "S", supplies: false,
        scheduledAt: new Date("2026-12-01T14:00:00.000Z"), address: "Calle Chapinero",
        priceLabor: 80_000, priceTotal: 86_900, payout: 56_000, status: "agendado",
      },
    });
    await prisma.leaveRequest.create({
      data: {
        quickerId: skilledQuickerId, kind: "vacaciones",
        startDate: new Date("2026-11-30T00:00:00.000Z"),
        endDate: new Date("2026-12-02T00:00:00.000Z"),
        status: "en_revision",
      },
    });
    const ranked2 = await svc.rankCandidates(pendingBooking.id);
    expect(ranked2.find((c) => c.quickerId === skilledQuickerId)!.available).toBe(true);

    // limpieza local
    await prisma.leaveRequest.deleteMany({ where: { quickerId: skilledQuickerId } });
    await prisma.serviceAssignment.deleteMany({ where: { bookingId: { in: [leaveBooking.id, pendingBooking.id] } } });
    await prisma.booking.deleteMany({ where: { id: { in: [leaveBooking.id, pendingBooking.id] } } });
  });
});
