import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { DATA_POLICY } from "./privacy.policy";
import { PrivacyService } from "./privacy.service";

describe("PrivacyService (integración) — Habeas Data", () => {
  const prisma = new PrismaService();
  const svc = new PrivacyService(prisma, new AuditService(prisma));
  const ts = Date.now();
  const email = `priv-${ts}@x.co`;
  let userId: string;
  let quickerId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const user = await prisma.user.create({ data: { email, phone: "3000000000", status: "active" } });
    userId = user.id;
    const q = await prisma.quicker.create({ data: { userId, name: "Priv Quicker", zone: "Centro", rating: 4.5 } });
    quickerId = q.id;
  });

  afterAll(async () => {
    await prisma.consent.deleteMany({ where: { userId } });
    await prisma.quicker.deleteMany({ where: { id: quickerId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("consentimiento: needsConsent true hasta aceptar la versión vigente", async () => {
    const before = await svc.consentStatus(userId);
    expect(before.needsConsent).toBe(true);
    await svc.giveConsent(userId, {});
    const after = await svc.consentStatus(userId);
    expect(after.needsConsent).toBe(false);
    expect(after.acceptedVersion).toBe(DATA_POLICY.version);
  });

  it("exporta los datos personales del titular", async () => {
    const data = await svc.exportData(userId);
    expect(data.account.email).toBe(email);
    expect(data.account.roles).toBeDefined();
    expect(data.quickerProfile?.name).toBe("Priv Quicker");
    expect(Array.isArray(data.consents)).toBe(true);
  });

  it("rectifica teléfono y nombre del perfil", async () => {
    await svc.rectify(userId, { phone: "3019999999", name: "Nombre Rectificado" }, {});
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const quicker = await prisma.quicker.findUnique({ where: { userId } });
    expect(user?.phone).toBe("3019999999");
    expect(quicker?.name).toBe("Nombre Rectificado");
  });

  it("suprime la cuenta: anonimiza PII, desactiva y conserva el registro", async () => {
    await svc.deleteAccount(userId, {});
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.email).toMatch(/@anonymized\.local$/);
    expect(user?.phone).toBeNull();
    expect(user?.status).toBe("inactive");
    expect(user?.deletedAt).not.toBeNull();
    const quicker = await prisma.quicker.findUnique({ where: { userId } });
    expect(quicker?.name).toBe("Usuario eliminado");
    // segunda supresión falla
    await expect(svc.deleteAccount(userId, {})).rejects.toThrow();
  });
});
