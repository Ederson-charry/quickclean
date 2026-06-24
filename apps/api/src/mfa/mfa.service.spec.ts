import { authenticator } from "otplib";
import { describe, expect, it } from "vitest";
import { EncryptionService } from "../common/encryption.service";
import { PrismaService } from "../prisma/prisma.service";
import { MfaService } from "./mfa.service";

interface FakeFactor {
  id: string;
  userId: string;
  type: string;
  secret: string;
  confirmedAt: Date | null;
  isDefault: boolean;
  lastUsedStep: bigint | null;
}

function fakePrisma(): PrismaService & { _factors: FakeFactor[] } {
  const factors: FakeFactor[] = [];
  return {
    _factors: factors,
    mfaFactor: {
      create: async ({ data }: { data: Partial<FakeFactor> }) => {
        const f: FakeFactor = {
          id: String(factors.length + 1),
          confirmedAt: null,
          isDefault: false,
          lastUsedStep: null,
          ...data,
        } as FakeFactor;
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
  } as unknown as PrismaService & { _factors: FakeFactor[] };
}

const enc = new EncryptionService();

describe("MfaService", () => {
  it("almacena la semilla cifrada en reposo (no en claro)", async () => {
    const prisma = fakePrisma();
    const { secret } = await new MfaService(prisma, enc).enroll("u1");
    expect(prisma._factors[0].secret).not.toBe(secret);
    expect(enc.decrypt(prisma._factors[0].secret)).toBe(secret);
  });

  it("un código TOTP válido confirma el enrolamiento", async () => {
    const svc = new MfaService(fakePrisma(), enc);
    const { secret } = await svc.enroll("u1");
    expect(await svc.confirm("u1", authenticator.generate(secret))).toBe(true);
  });

  it("verify rechaza un código inválido", async () => {
    const svc = new MfaService(fakePrisma(), enc);
    const { secret } = await svc.enroll("u1");
    await svc.confirm("u1", authenticator.generate(secret));
    expect(await svc.verify("u1", "000000")).toBe(false);
  });

  it("anti-replay: un código ya consumido no se puede reutilizar", async () => {
    const svc = new MfaService(fakePrisma(), enc);
    const { secret } = await svc.enroll("u1");
    const token = authenticator.generate(secret);
    expect(await svc.confirm("u1", token)).toBe(true);
    // mismo token (mismo paso TOTP) ya fue consumido al confirmar
    expect(await svc.verify("u1", token)).toBe(false);
  });

  it("isEnrolled true solo tras confirmar", async () => {
    const svc = new MfaService(fakePrisma(), enc);
    const { secret } = await svc.enroll("u1");
    expect(await svc.isEnrolled("u1")).toBe(false);
    await svc.confirm("u1", authenticator.generate(secret));
    expect(await svc.isEnrolled("u1")).toBe(true);
  });
});
