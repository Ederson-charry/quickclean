import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

describe("UsersService (integración)", () => {
  const prisma = new PrismaService();
  const users = new UsersService(prisma);
  let id: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const u = await prisma.user.create({ data: { email: `t${Date.now()}@x.co`, status: "active" } });
    id = u.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("isInactive false para usuario recién activo", async () => {
    expect(await users.isInactive(id)).toBe(false);
  });

  it("touchActivity actualiza lastActivityAt", async () => {
    const before = (await prisma.user.findUnique({ where: { id } }))!.lastActivityAt;
    await new Promise((r) => setTimeout(r, 5));
    await users.touchActivity(id);
    const after = (await prisma.user.findUnique({ where: { id } }))!.lastActivityAt;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });

  it("permissionsOf devuelve [] para usuario sin roles", async () => {
    expect(await users.permissionsOf(id)).toEqual([]);
  });

  it("profile devuelve email y roles/permisos vacíos para usuario sin roles", async () => {
    const p = await users.profile(id);
    expect(p?.email).toContain("@x.co");
    expect(p?.roles).toEqual([]);
    expect(p?.permissions).toEqual([]);
  });

  it("setStatus cambia el estado", async () => {
    const u = await users.setStatus(id, "suspended");
    expect(u.status).toBe("suspended");
    await users.setStatus(id, "active");
  });
});
