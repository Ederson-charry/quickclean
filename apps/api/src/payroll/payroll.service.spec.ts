import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CST } from "./cst";
import { PayrollService } from "./payroll.service";

describe("PayrollService (integración) — motor de nómina CST", () => {
  const prisma = new PrismaService();
  const svc = new PayrollService(prisma, new AuditService(prisma));
  let quickerUserId: string;
  let quickerId: string;
  let employeeContractId: string;
  let contractorContractId: string;
  let adminId: string;
  let runId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const u = await prisma.user.create({ data: { email: `pr-${Date.now()}@x.co`, status: "active" } });
    quickerUserId = u.id;
    const q = await prisma.quicker.create({ data: { userId: u.id, name: "Payroll Quicker", zone: "Centro", rating: 4.8 } });
    quickerId = q.id;
    const admin = await prisma.user.create({ data: { email: `pra-${Date.now()}@x.co`, status: "active" } });
    adminId = admin.id;
    const emp = await prisma.workContract.create({
      data: { quickerId, engagementType: "employee", contractKind: "indefinido", monthlySalary: 1_800_000, status: "activo" },
    });
    employeeContractId = emp.id;
    const con = await prisma.workContract.create({
      data: { quickerId, engagementType: "contractor", contractKind: "prestacion", status: "activo" },
    });
    contractorContractId = con.id;
  });

  afterAll(async () => {
    await prisma.payrollRun.deleteMany({ where: { quickerId } });
    await prisma.workContract.deleteMany({ where: { quickerId } });
    await prisma.quicker.delete({ where: { id: quickerId } });
    await prisma.user.deleteMany({ where: { id: { in: [quickerUserId, adminId] } } });
    await prisma.$disconnect();
  });

  it("calcula un mes completo: base + auxilio − salud/pensión", () => {
    const b = svc.compute(1_800_000, new Date("2026-06-01"), new Date("2026-06-30"), []);
    expect(b.days).toBe(30);
    expect(b.baseSalary).toBe(1_800_000);
    // 1.8M ≤ 2·SMMLV ⇒ aplica auxilio
    expect(b.transportAllowance).toBe(CST.auxTransporte);
    expect(b.healthDeduction).toBe(72_000); // 4%
    expect(b.pensionDeduction).toBe(72_000);
    expect(b.grossEarnings).toBe(1_800_000 + CST.auxTransporte);
    expect(b.netPay).toBe(b.grossEarnings - 144_000);
  });

  it("prorratea por días y aplica bonos y deducciones extra", () => {
    const b = svc.compute(3_000_000, new Date("2026-06-01"), new Date("2026-06-15"), [
      { concept: "Bono productividad", kind: "bono", amount: 100_000 },
      { concept: "Préstamo", kind: "deduccion", amount: 50_000 },
    ]);
    expect(b.days).toBe(15);
    expect(b.baseSalary).toBe(1_500_000); // 3M · 15/30
    expect(b.transportAllowance).toBe(0); // 3M > 2·SMMLV
    expect(b.bonuses).toBe(100_000);
    expect(b.grossEarnings).toBe(1_500_000 + 100_000);
    expect(b.otherDeductions).toBe(50_000);
    expect(b.totalDeductions).toBe(60_000 + 60_000 + 50_000);
    expect(b.netPay).toBe(1_600_000 - 170_000);
  });

  it("rechaza liquidar un contrato contractor (no es employee)", async () => {
    await expect(
      svc.preview(contractorContractId, new Date("2026-06-01"), new Date("2026-06-30"), []),
    ).rejects.toThrow();
  });

  it("liquida (persiste PayrollRun) y bloquea duplicado del mismo período", async () => {
    const run = await svc.run(employeeContractId, new Date("2026-06-01"), new Date("2026-06-30"), [], adminId);
    runId = run.id;
    expect(run.status).toBe("calculada");
    expect(run.netPay).toBe(1_800_000 + CST.auxTransporte - 144_000);
    await expect(
      svc.run(employeeContractId, new Date("2026-06-01"), new Date("2026-06-30"), [], adminId),
    ).rejects.toThrow();
  });

  it("marca pagada y bloquea pagar dos veces", async () => {
    const paid = await svc.markPaid(runId, adminId);
    expect(paid.status).toBe("pagada");
    expect(paid.paidAt).not.toBeNull();
    await expect(svc.markPaid(runId, adminId)).rejects.toThrow();
  });

  it("eligibleContracts incluye el employee con salario, no el contractor", async () => {
    const list = await svc.eligibleContracts();
    expect(list.some((c) => c.id === employeeContractId)).toBe(true);
    expect(list.some((c) => c.id === contractorContractId)).toBe(false);
  });
});
