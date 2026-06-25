import { z } from "zod";

export const PayrollExtraInput = z.object({
  concept: z.string().trim().min(1).max(60),
  kind: z.enum(["bono", "deduccion"]),
  amount: z.number().int().positive(),
});

export const PayrollPreviewInput = z.object({
  contractId: z.string().uuid(),
  periodFrom: z.coerce.date(),
  periodTo: z.coerce.date(),
  extras: z.array(PayrollExtraInput).max(20).optional().default([]),
});
export type PayrollPreviewInput = z.infer<typeof PayrollPreviewInput>;
