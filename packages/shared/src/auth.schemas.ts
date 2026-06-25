import { z } from "zod";

export const LoginInput = z.object({
  email: z.email(),
  password: z.string().min(12),
  turnstileToken: z.string().optional(),
  otp: z.string().length(6).optional(),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;

/** Cambio de contraseña forzado (primer ingreso): sin sesión, identifica por email. */
export const ForcedPasswordChangeInput = z.object({
  email: z.email(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});
export type ForcedPasswordChangeInput = z.infer<typeof ForcedPasswordChangeInput>;

/** Solicitud de restablecimiento de contraseña (envía enlace por correo). */
export const RecoverPasswordInput = z.object({ email: z.email() });
export type RecoverPasswordInput = z.infer<typeof RecoverPasswordInput>;

/** Restablecimiento con token de un solo uso. */
export const ResetPasswordInput = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(12),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;
