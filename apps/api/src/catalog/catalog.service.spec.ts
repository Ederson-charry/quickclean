import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { CatalogService } from "./catalog.service";

describe("CatalogService (integración)", () => {
  const prisma = new PrismaService();
  const catalog = new CatalogService(prisma);
  let id: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
  });
  afterAll(async () => {
    await prisma.serviceCategory.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("crea una categoría y aparece en las activas", async () => {
    const c = await catalog.create({
      slug: `cat-${Date.now()}`,
      name: "Limpieza test",
      iconName: "Sparkles",
      colorToken: "brand-600",
    });
    id = c.id;
    const active = await catalog.listActive();
    expect(active.some((x) => x.id === id)).toBe(true);
  });

  it("archivar la saca de las activas (sin borrarla)", async () => {
    const archived = await catalog.archive(id);
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.active).toBe(false);
    const active = await catalog.listActive();
    expect(active.some((x) => x.id === id)).toBe(false);
    // sigue existiendo (la referencian históricos)
    expect(await prisma.serviceCategory.findUnique({ where: { id } })).not.toBeNull();
  });
});
