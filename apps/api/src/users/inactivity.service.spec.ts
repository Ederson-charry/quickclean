import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { InactivityService } from "./inactivity.service";

describe("InactivityService (integración)", () => {
  const prisma = new PrismaService();
  const svc = new InactivityService(prisma, new AuditService(prisma));
  let oldId: string;
  let freshId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const old = await prisma.user.create({
      data: {
        email: `old-${Date.now()}@x.co`,
        status: "active",
        lastActivityAt: new Date(Date.now() - 91 * 86_400_000),
      },
    });
    const fresh = await prisma.user.create({ data: { email: `fresh-${Date.now()}@x.co`, status: "active" } });
    oldId = old.id;
    freshId = fresh.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [oldId, freshId] } } });
    await prisma.$disconnect();
  });

  it("marca inactive a la cuenta sin actividad > 90 días y respeta la reciente", async () => {
    const count = await svc.markInactive();
    expect(count).toBeGreaterThanOrEqual(1);
    expect((await prisma.user.findUnique({ where: { id: oldId } }))!.status).toBe("inactive");
    expect((await prisma.user.findUnique({ where: { id: freshId } }))!.status).toBe("active");
  });
});
