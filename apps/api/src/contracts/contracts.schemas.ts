import { z } from "zod";

export const CreateContractInput = z
  .object({
    quickerId: z.string().uuid(),
    /** Empresa/cliente vinculante; ausente = pool (vinculación con QuickClean). */
    clientId: z.string().uuid().optional(),
    engagementType: z.enum(["contractor", "employee"]),
    position: z.string().trim().min(2).max(80).optional(),
    contractKind: z.enum(["prestacion", "fijo", "indefinido"]),
    startDate: z.coerce.date().optional(),
  })
  .refine((d) => (d.engagementType === "contractor" ? d.contractKind === "prestacion" : d.contractKind !== "prestacion"), {
    message: "contractor ⇒ prestación; employee ⇒ fijo o indefinido",
    path: ["contractKind"],
  });
export type CreateContractInput = z.infer<typeof CreateContractInput>;
