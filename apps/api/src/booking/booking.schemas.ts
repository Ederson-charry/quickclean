import { z } from "zod";

export const CreateBookingInput = z.object({
  serviceCategoryId: z.string().uuid(),
  duration: z.coerce.number().int().positive(),
  frequency: z.string().min(1),
  size: z.string().min(1),
  supplies: z.coerce.boolean(),
  scheduledAt: z.coerce.date(),
  address: z.string().min(3),
  notes: z.string().optional(),
  pets: z.coerce.boolean().optional(),
});
export type CreateBookingInput = z.infer<typeof CreateBookingInput>;
