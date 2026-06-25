import { z } from "zod";

export const CreateQuickerInput = z.object({
  email: z.email(),
  name: z.string().trim().min(2).max(80),
  zone: z.string().trim().min(2).max(60),
  rating: z.number().min(0).max(5).optional(),
  skills: z.array(z.string().uuid()).max(50).optional().default([]),
});
export type CreateQuickerInput = z.infer<typeof CreateQuickerInput>;

export const UpdateQuickerInput = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  zone: z.string().trim().min(2).max(60).optional(),
  rating: z.number().min(0).max(5).optional(),
  active: z.boolean().optional(),
  skills: z.array(z.string().uuid()).max(50).optional(),
});
export type UpdateQuickerInput = z.infer<typeof UpdateQuickerInput>;

export const CreateClientInput = z.object({
  email: z.email(),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["persona", "empresa"]),
  requiresDirectHire: z.boolean().optional(),
  phone: z.string().trim().max(20).optional(),
});
export type CreateClientInput = z.infer<typeof CreateClientInput>;

export const UpdateClientInput = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  kind: z.enum(["persona", "empresa"]).optional(),
  requiresDirectHire: z.boolean().optional(),
});
export type UpdateClientInput = z.infer<typeof UpdateClientInput>;
