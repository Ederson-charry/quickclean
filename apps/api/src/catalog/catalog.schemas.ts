import { z } from "zod";

export const CreateCategoryInput = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "slug en minúsculas, guiones"),
  name: z.string().min(2),
  description: z.string().optional(),
  iconName: z.string().min(1),
  colorToken: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
});
export type CreateCategoryInput = z.infer<typeof CreateCategoryInput>;

/** Edición de una categoría (no cambia el slug: lo referencian tarifas/históricos). */
export const UpdateCategoryInput = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  iconName: z.string().min(1).optional(),
  colorToken: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInput>;

export const TariffRuleInput = z.object({
  dimension: z.enum(["duration", "frequency", "size", "supplies", "platform_fee", "payout_pct", "holiday"]),
  key: z.string(),
  modifierType: z.enum(["base", "percent", "multiplier", "flat"]),
  value: z.number(),
});

export const PublishTariffInput = z.object({
  serviceCategoryId: z.string().uuid(),
  name: z.string().min(2),
  effectiveFrom: z.coerce.date(),
  rules: z.array(TariffRuleInput).min(1),
  /** Código 2FA para step-up al publicar (sólo exigido si el usuario tiene 2FA). */
  otp: z.string().length(6).optional(),
});
export type PublishTariffInput = z.infer<typeof PublishTariffInput>;

export const PricePreviewInput = z.object({
  serviceCategoryId: z.string().uuid(),
  duration: z.coerce.number().int().positive(),
  frequency: z.string().min(1),
  size: z.string().min(1),
  supplies: z.coerce.boolean(),
  holiday: z.coerce.boolean().optional(),
  /** Fecha del servicio: si se envía, el backend determina si es festivo. */
  scheduledAt: z.coerce.date().optional(),
});
export type PricePreviewInput = z.infer<typeof PricePreviewInput>;

/** Simulación stateless: calcula el precio con reglas de borrador (antes de publicar). */
export const SimulateTariffInput = z.object({
  rules: z.array(TariffRuleInput).min(1),
  duration: z.coerce.number().int().positive(),
  frequency: z.string().min(1),
  size: z.string().min(1),
  supplies: z.coerce.boolean(),
  holiday: z.coerce.boolean().optional(),
});
export type SimulateTariffInput = z.infer<typeof SimulateTariffInput>;
