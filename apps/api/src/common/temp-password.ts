import { randomBytes } from "node:crypto";

/**
 * Genera una contraseña temporal aleatoria que cumple la política (≥12 caracteres).
 * Se entrega una sola vez al crear la cuenta; el usuario debe cambiarla al ingresar.
 */
export function generateTempPassword(): string {
  return `Qk-${randomBytes(12).toString("base64url")}`;
}
