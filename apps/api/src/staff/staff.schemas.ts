import { z } from "zod";

const phone = z.string().trim().max(20).optional();

export const CreateQuickerInput = z.object({
  email: z.email(),
  name: z.string().trim().min(2).max(80),
  zone: z.string().trim().min(2).max(60),
  phone,
  rating: z.number().min(0).max(5).optional(),
  skills: z.array(z.string().uuid()).max(50).optional().default([]),
});
export type CreateQuickerInput = z.infer<typeof CreateQuickerInput>;

export const UpdateQuickerInput = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  zone: z.string().trim().min(2).max(60).optional(),
  phone,
  rating: z.number().min(0).max(5).optional(),
  active: z.boolean().optional(),
  skills: z.array(z.string().uuid()).max(50).optional(),
});
export type UpdateQuickerInput = z.infer<typeof UpdateQuickerInput>;

const docType = z.enum(["cc", "nit", "ce", "pasaporte"]);

export const CreateClientInput = z.object({
  email: z.email(),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["persona", "empresa"]),
  docType: docType.optional(),
  docNumber: z.string().trim().max(40).optional(),
  requiresDirectHire: z.boolean().optional(),
  phone,
});
export type CreateClientInput = z.infer<typeof CreateClientInput>;

export const UpdateClientInput = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  kind: z.enum(["persona", "empresa"]).optional(),
  docType: docType.optional(),
  docNumber: z.string().trim().max(40).optional(),
  requiresDirectHire: z.boolean().optional(),
  phone,
  active: z.boolean().optional(),
});
export type UpdateClientInput = z.infer<typeof UpdateClientInput>;
