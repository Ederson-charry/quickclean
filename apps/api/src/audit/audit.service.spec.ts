import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";

describe("AuditService (integración)", () => {
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);

  beforeAll(async () => {
    await prisma.onModuleInit();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("encadena eventos y verifyChain pasa", async () => {
    const e1 = await audit.record({ action: "test.a", outcome: "success" });
    const e2 = await audit.record({ action: "test.b", outcome: "failure", actorId: "u1" });
    expect(e2.hashPrev).toBe(e1.hashSelf);
    const v = await audit.verifyChain();
    expect(v.ok).toBe(true);
    expect(v.count).toBeGreaterThanOrEqual(2);
  });

  it("el log es inmutable: UPDATE y DELETE son rechazados por el DB", async () => {
    const e = await audit.record({ action: "test.c", outcome: "success" });
    await expect(
      prisma.auditLog.update({ where: { id: e.id }, data: { action: "hack" } }),
    ).rejects.toThrow();
    await expect(prisma.auditLog.delete({ where: { id: e.id } })).rejects.toThrow();
  });

  it("list filtra por action y devuelve seq como string", async () => {
    const action = `test.unique-${Date.now()}`;
    await audit.record({ action, outcome: "success", metadata: { foo: "bar" } });
    const r = await audit.list({ action });
    expect(r.total).toBeGreaterThanOrEqual(1);
    expect(r.items.every((i) => i.action === action)).toBe(true);
    expect(typeof r.items[0].seq).toBe("string");
  });
});
