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

export const TariffRuleInput = z.object({
  dimension: z.enum(["duration", "frequency", "size", "supplies", "platform_fee", "payout_pct"]),
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
});
export type PricePreviewInput = z.infer<typeof PricePreviewInput>;
