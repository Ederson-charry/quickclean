export interface PriceRule {
  dimension: string;
  key: string;
  modifierType: string;
  value: number;
}

export interface PriceInput {
  /** Duración en horas (4 | 6 | 8 …). */
  duration: number;
  /** Frecuencia (unica | semanal | quincenal | mensual). */
  frequency: string;
  /** Tamaño del inmueble (S | M | L …). */
  size: string;
  /** ¿Incluye insumos? */
  supplies: boolean;
}

export interface PriceBreakdown {
  base: number;
  sizeMultiplier: number;
  frequencyDiscount: number;
  suppliesCost: number;
  platformFee: number;
  /** Mano de obra ya ajustada por tamaño y frecuencia. */
  labor: number;
  total: number;
  payout: number;
}

function ruleValue(rules: PriceRule[], dimension: string, key: string): number | undefined {
  return rules.find((r) => r.dimension === dimension && r.key === key)?.value;
}

/**
 * Calcula el precio a partir de las reglas de una tarifa vigente.
 * A diferencia del pricing hardcodeado del demo, el tamaño SÍ influye (regla `size`).
 */
export function computePrice(rules: PriceRule[], input: PriceInput): PriceBreakdown {
  const base = ruleValue(rules, "duration", String(input.duration)) ?? 0;
  const sizeMultiplier = ruleValue(rules, "size", input.size) ?? 1;
  const frequencyDiscount = ruleValue(rules, "frequency", input.frequency) ?? 0;
  const suppliesCost = input.supplies ? (ruleValue(rules, "supplies", "") ?? 0) : 0;
  const platformFee = ruleValue(rules, "platform_fee", "") ?? 0;
  const payoutPct = ruleValue(rules, "payout_pct", "") ?? 0.7;

  const labor = Math.round(base * sizeMultiplier * (1 - frequencyDiscount));
  const total = labor + suppliesCost + platformFee;
  const payout = Math.round(labor * payoutPct);

  return { base, sizeMultiplier, frequencyDiscount, suppliesCost, platformFee, labor, total, payout };
}
