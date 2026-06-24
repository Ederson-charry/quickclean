import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado simétrico AES-256-GCM para secretos en reposo (ej. semilla TOTP).
 * Formato: base64(iv):base64(tag):base64(ciphertext).
 * La clave deriva de MFA_ENC_KEY (en prod, desde Secrets Manager).
 */
@Injectable()
export class EncryptionService {
  private key(): Buffer {
    const secret = process.env.MFA_ENC_KEY ?? "dev-only-mfa-key-change-me";
    return createHash("sha256").update(secret).digest(); // 32 bytes
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
  }

  decrypt(payload: string): string {
    const [ivB, tagB, dataB] = payload.split(":");
    const decipher = createDecipheriv("aes-256-gcm", this.key(), Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
  }
}
