import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PasswordService } from "../auth/password.service";
import { PrismaService } from "../prisma/prisma.service";
import { StaffService } from "./staff.service";

describe("StaffService (integración) — alta de quickers y clientes", () => {
  const prisma = new PrismaService();
  const svc = new StaffService(prisma, new PasswordService(), new AuditService(prisma));
  const ts = Date.now();
  const qEmail = `staff-q-${ts}@x.co`;
  const cEmail = `staff-c-${ts}@x.co`;
  let adminId: string;
  let categoryId: string;
  let quickerId: string;
  let clientId: string;
  let createdUserIds: string[] = [];

  beforeAll(async () => {
    await prisma.onModuleInit();
    const admin = await prisma.user.create({ data: { email: `staff-a-${ts}@x.co`, status: "active" } });
    adminId = admin.id;
    const cat = await prisma.serviceCategory.create({
      data: { slug: `staff-${ts}`, name: "Staff cat", iconName: "Sparkles", colorToken: "brand-600" },
    });
    categoryId = cat.id;
  });

  afterAll(async () => {
    if (quickerId) {
      await prisma.quickerSkill.deleteMany({ where: { quickerId } });
      await prisma.quicker.deleteMany({ where: { id: quickerId } });
    }
    if (clientId) await prisma.client.deleteMany({ where: { id: clientId } });
    const emails = [qEmail, cEmail, `staff-a-${ts}@x.co`];
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.serviceCategory.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("crea un quicker con usuario, credencial mustChange, rol y skills", async () => {
    const { quicker, tempPassword } = await svc.createQuicker(
      { email: qEmail, name: "Nueva Quicker", zone: "Kennedy", skills: [categoryId] },
      adminId,
    );
    quickerId = quicker.id;
    expect(tempPassword.length).toBeGreaterThanOrEqual(12);

    const user = await prisma.user.findUnique({
      where: { email: qEmail },
      include: { credential: true, roles: { include: { role: true } } },
    });
    createdUserIds.push(user!.id);
    expect(user?.credential?.mustChangePassword).toBe(true);
    expect(user?.roles.some((r) => r.role.key === "quicker")).toBe(true);
    const skills = await prisma.quickerSkill.findMany({ where: { quickerId } });
    expect(skills).toHaveLength(1);
  });

  it("rechaza email duplicado", async () => {
    await expect(
      svc.createQuicker({ email: qEmail, name: "Otra", zone: "X", skills: [] }, adminId),
    ).rejects.toThrow();
  });

  it("actualiza zona/activo y reemplaza skills", async () => {
    const updated = await svc.updateQuicker(quickerId, { zone: "Bosa", active: false, skills: [] }, adminId);
    expect(updated.zone).toBe("Bosa");
    expect(updated.active).toBe(false);
    const skills = await prisma.quickerSkill.findMany({ where: { quickerId } });
    expect(skills).toHaveLength(0);
  });

  it("crea una empresa con requiresDirectHire por defecto", async () => {
    const { client, tempPassword } = await svc.createClient(
      { email: cEmail, name: "Empresa Nueva SAS", kind: "empresa" },
      adminId,
    );
    clientId = client.id;
    expect(tempPassword.length).toBeGreaterThanOrEqual(12);
    expect(client.requiresDirectHire).toBe(true);
    const user = await prisma.user.findUnique({
      where: { email: cEmail },
      include: { roles: { include: { role: true } } },
    });
    expect(user?.roles.some((r) => r.role.key === "client")).toBe(true);
  });

  it("lista quickers y clientes incluyendo los creados", async () => {
    const quickers = await svc.listQuickers();
    expect(quickers.some((q) => q.id === quickerId)).toBe(true);
    const clients = await svc.listClients();
    expect(clients.some((c) => c.id === clientId)).toBe(true);
  });
});
