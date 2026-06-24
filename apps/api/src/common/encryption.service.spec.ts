import { describe, expect, it } from "vitest";
import { EncryptionService } from "./encryption.service";

const svc = new EncryptionService();

describe("EncryptionService", () => {
  it("cifra y descifra de ida y vuelta", () => {
    const plain = "JBSWY3DPEHPK3PXP";
    const enc = svc.encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(svc.decrypt(enc)).toBe(plain);
  });

  it("cada cifrado usa un IV distinto (no determinista)", () => {
    expect(svc.encrypt("x")).not.toBe(svc.encrypt("x"));
  });

  it("falla al descifrar si el ciphertext fue manipulado (GCM auth)", () => {
    const enc = svc.encrypt("secreto");
    const [iv, tag] = enc.split(":");
    const tampered = `${iv}:${tag}:${Buffer.from("otro").toString("base64")}`;
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
