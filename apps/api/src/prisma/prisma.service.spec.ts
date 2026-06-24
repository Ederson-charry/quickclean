import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("conecta y consulta", async () => {
    await prisma.onModuleInit();
    const count = await prisma.user.count();
    expect(typeof count).toBe("number");
  });
});
