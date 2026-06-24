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
