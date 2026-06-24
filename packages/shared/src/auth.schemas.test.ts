import { describe, it, expect } from "vitest";
import { LoginInput, ChangePasswordInput } from "./auth.schemas";

describe("LoginInput", () => {
  it("acepta email válido + password + turnstileToken opcional", () => {
    const r = LoginInput.safeParse({ email: "a@b.co", password: "x".repeat(12) });
    expect(r.success).toBe(true);
  });
  it("rechaza email inválido", () => {
    const r = LoginInput.safeParse({ email: "no-email", password: "x".repeat(12) });
    expect(r.success).toBe(false);
  });
  it("rechaza password de menos de 12 caracteres", () => {
    const r = LoginInput.safeParse({ email: "a@b.co", password: "corta" });
    expect(r.success).toBe(false);
  });
  it("acepta otp de 6 dígitos", () => {
    const r = LoginInput.safeParse({ email: "a@b.co", password: "x".repeat(12), otp: "123456" });
    expect(r.success).toBe(true);
  });
});

describe("ChangePasswordInput", () => {
  it("exige newPassword de al menos 12 caracteres", () => {
    expect(ChangePasswordInput.safeParse({ currentPassword: "x", newPassword: "y".repeat(12) }).success).toBe(true);
    expect(ChangePasswordInput.safeParse({ currentPassword: "x", newPassword: "corta" }).success).toBe(false);
  });
});
