import { authenticator } from "otplib";
import { describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { MfaService } from "./mfa.service";

interface FakeFactor {
  id: string;
  userId: string;
  type: string;
  secret: string;
  confirmedAt: Date | null;
  isDefault: boolean;
}

function fakePrisma(): PrismaService {
  const factors: FakeFactor[] = [];
  return {
    mfaFactor: {
      create: async ({ data }: { data: Partial<FakeFactor> }) => {
        const f: FakeFactor = { id: String(factors.length + 1), confirmedAt: null, isDefault: false, ...data } as FakeFactor;
        factors.push(f);
        return f;
      },
      findFirst: async ({ where }: { where: { userId: string; confirmedAt?: unknown } }) =>
        factors.find(
          (f) => f.userId === where.userId && (where.confirmedAt === undefined || f.confirmedAt != null),
        ) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<FakeFactor> }) => {
        const f = factors.find((x) => x.id === where.id)!;
        Object.assign(f, data);
        return f;
      },
    },
  } as unknown as PrismaService;
}

describe("MfaService", () => {
  it("genera secret y un código TOTP válido confirma el enrolamiento", async () => {
    const svc = new MfaService(fakePrisma());
    const { secret } = await svc.enroll("u1");
    const token = authenticator.generate(secret);
    expect(await svc.confirm("u1", token)).toBe(true);
  });

  it("verify rechaza un código inválido", async () => {
    const svc = new MfaService(fakePrisma());
    const { secret } = await svc.enroll("u1");
    await svc.confirm("u1", authenticator.generate(secret));
    expect(await svc.verify("u1", "000000")).toBe(false);
  });

  it("isEnrolled true solo tras confirmar", async () => {
    const svc = new MfaService(fakePrisma());
    const { secret } = await svc.enroll("u1");
    expect(await svc.isEnrolled("u1")).toBe(false);
    await svc.confirm("u1", authenticator.generate(secret));
    expect(await svc.isEnrolled("u1")).toBe(true);
  });
});
