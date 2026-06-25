import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContractInput } from "./contracts.schemas";
import { ContractsService } from "./contracts.service";

describe("ContractsService (integración)", () => {
  const prisma = new PrismaService();
  const svc = new ContractsService(prisma, new AuditService(prisma));
  let quickerUserId: string;
  let quickerId: string;
  let empUserId: string;
  let empClientId: string;
  let adminId: string;
  let contractId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const u = await prisma.user.create({ data: { email: `ctq-${Date.now()}@x.co`, status: "active" } });
    quickerUserId = u.id;
    const q = await prisma.quicker.create({ data: { userId: u.id, name: "Contract Quicker", zone: "Centro", rating: 4.7 } });
    quickerId = q.id;
    const emp = await prisma.user.create({ data: { email: `cte-${Date.now()}@x.co`, status: "active" } });
    empUserId = emp.id;
    const client = await prisma.client.create({
      data: { userId: emp.id, name: "Empresa Test SAS", kind: "empresa", requiresDirectHire: true },
    });
    empClientId = client.id;
    const admin = await prisma.user.create({ data: { email: `cta-${Date.now()}@x.co`, status: "active" } });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.workContract.deleteMany({ where: { quickerId } });
    await prisma.quicker.delete({ where: { id: quickerId } });
    await prisma.client.delete({ where: { id: empClientId } });
    await prisma.user.deleteMany({ where: { id: { in: [quickerUserId, empUserId, adminId] } } });
    await prisma.$disconnect();
  });

  it("el schema rechaza combinaciones incoherentes (employee con prestación)", () => {
    expect(
      CreateContractInput.safeParse({ quickerId, engagementType: "employee", contractKind: "prestacion" }).success,
    ).toBe(false);
    expect(
      CreateContractInput.safeParse({ quickerId, engagementType: "contractor", contractKind: "indefinido" }).success,
    ).toBe(false);
    expect(
      CreateContractInput.safeParse({ quickerId, engagementType: "employee", contractKind: "indefinido" }).success,
    ).toBe(true);
  });

  it("opciones devuelve quickers activos y clientes", async () => {
    const opts = await svc.options();
    expect(opts.quickers.some((q) => q.id === quickerId)).toBe(true);
    expect(opts.clients.some((c) => c.id === empClientId)).toBe(true);
  });

  it("crea un contrato laboral employee con empresa", async () => {
    const c = await svc.create(
      { quickerId, clientId: empClientId, engagementType: "employee", contractKind: "indefinido", position: "Operaria" },
      adminId,
    );
    contractId = c.id;
    expect(c.status).toBe("activo");
    expect(c.engagementType).toBe("employee");
    expect(c.clientId).toBe(empClientId);
  });

  it("rechaza un contrato activo duplicado equivalente", async () => {
    await expect(
      svc.create({ quickerId, clientId: empClientId, engagementType: "employee", contractKind: "fijo" }, adminId),
    ).rejects.toThrow();
  });

  it("finaliza el contrato y bloquea finalizar dos veces", async () => {
    const done = await svc.finalize(contractId, adminId);
    expect(done.status).toBe("finalizado");
    expect(done.endDate).not.toBeNull();
    await expect(svc.finalize(contractId, adminId)).rejects.toThrow();
  });

  it("tras finalizar, ya no cuenta como duplicado: permite re-crear", async () => {
    const again = await svc.create(
      { quickerId, clientId: empClientId, engagementType: "employee", contractKind: "indefinido" },
      adminId,
    );
    expect(again.status).toBe("activo");
  });
});
