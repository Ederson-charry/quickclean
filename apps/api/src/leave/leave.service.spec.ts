import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { LeaveService } from "./leave.service";

describe("LeaveService (integración)", () => {
  const prisma = new PrismaService();
  const svc = new LeaveService(prisma, new AuditService(prisma));
  let quickerUserId: string;
  let quickerId: string;
  let adminId: string;
  let leaveId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const u = await prisma.user.create({ data: { email: `lvq-${Date.now()}@x.co`, status: "active" } });
    quickerUserId = u.id;
    const q = await prisma.quicker.create({ data: { userId: u.id, name: "Leave Quicker", zone: "Centro", rating: 4.8 } });
    quickerId = q.id;
    const admin = await prisma.user.create({ data: { email: `lva-${Date.now()}@x.co`, status: "active" } });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.leaveRequest.deleteMany({ where: { quickerId } });
    await prisma.quicker.delete({ where: { id: quickerId } });
    await prisma.user.deleteMany({ where: { id: { in: [quickerUserId, adminId] } } });
    await prisma.$disconnect();
  });

  it("rechaza enviar solicitud si el usuario no es quicker", async () => {
    await expect(
      svc.submit(adminId, { kind: "licencia", startDate: new Date(), endDate: new Date() }),
    ).rejects.toThrow();
  });

  it("el quicker envía una solicitud en revisión y la ve listada", async () => {
    const r = await svc.submit(quickerUserId, {
      kind: "incapacidad",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-03"),
      reason: "EPS",
    });
    leaveId = r.id;
    expect(r.status).toBe("en_revision");
    const mine = await svc.listForQuicker(quickerUserId);
    expect(mine.some((x) => x.id === leaveId)).toBe(true);
  });

  it("aparece en el listado admin y puede filtrarse por estado", async () => {
    const enRevision = await svc.listAll("en_revision");
    expect(enRevision.some((x) => x.id === leaveId)).toBe(true);
    const aprobadas = await svc.listAll("aprobada");
    expect(aprobadas.some((x) => x.id === leaveId)).toBe(false);
  });

  it("el admin aprueba y luego no puede volver a decidir", async () => {
    const decided = await svc.decide(leaveId, "aprobada", adminId);
    expect(decided.status).toBe("aprobada");
    expect(decided.reviewedById).toBe(adminId);
    expect(decided.reviewedAt).not.toBeNull();
    await expect(svc.decide(leaveId, "rechazada", adminId)).rejects.toThrow();
  });
});
