import type { PriceRule } from "./pricing";

export type Nature = "base" | "cost" | "discount";
export type ValueType = "table" | "fixed" | "percent";
export type AppliesOn = "base" | "subtotal" | "selection";
export type PayoutType = "percent" | "fixed";

export interface SelectionRef {
  code: string;
  op: "add" | "sub";
}

/** Definición de un componente de tarifa (independiente de Prisma). */
export interface ComponentDef {
  code: string;
  order: number;
  label: string;
  nature: Nature;
  valueType: ValueType;
  value: number;
  durationTable?: Record<string, number> | null;
  appliesOn: AppliesOn;
  appliesOnRefs?: SelectionRef[] | null;
  condParam?: string | null;
  condValue?: string | null;
  countsForPayout: boolean;
  visibleToClient: boolean;
}

export interface PayoutConfig {
  type: PayoutType;
  value: number;
}

export interface PriceParams {
  duration: number;
  frequency: string;
  size: string;
  supplies: boolean;
  holiday?: boolean;
}

/** Una línea del desglose (aporte firmado + fórmula legible). */
export interface PriceLine {
  code: string;
  label: string;
  nature: Nature;
  amount: number; // firmado (descuento negativo)
  formula: string;
  countsForPayout: boolean;
  visibleToClient: boolean;
}

export interface ComponentBreakdown {
  lines: PriceLine[];
  total: number;
  payoutBase: number;
  payoutType: PayoutType;
  payoutValue: number;
  payout: number;
}

const pctStr = (n: number): string => `${Math.round(n * 100)}%`;

/** ¿Se cumple la condición del componente para estos parámetros? */
function conditionHolds(c: ComponentDef, p: PriceParams): boolean {
  if (!c.condParam) return true;
  switch (c.condParam) {
    case "size":
      return p.size === c.condValue;
    case "frequency":
      return p.frequency === c.condValue;
    case "duration":
      return String(p.duration) === c.condValue;
    case "supplies":
      return p.supplies === (c.condValue === "true");
    case "holiday":
      return (p.holiday ?? false) === (c.condValue === "true");
    default:
      return true;
  }
}

/** Base de cálculo de un % según su modo (base | subtotal-hasta-aquí | selección firmada). */
function calcBase(
  c: ComponentDef,
  base: number,
  subtotalBefore: number,
  amounts: Map<string, number>,
): { value: number; label: string } {
  if (c.appliesOn === "base") return { value: base, label: "base" };
  if (c.appliesOn === "subtotal") return { value: subtotalBefore, label: "subtotal" };
  // selección firmada
  let s = 0;
  const parts: string[] = [];
  for (const ref of c.appliesOnRefs ?? []) {
    const v = amounts.get(ref.code) ?? 0;
    s += ref.op === "sub" ? -v : v;
    parts.push(`${ref.op === "sub" ? "−" : "+"} ${ref.code}`);
  }
  return { value: s, label: parts.join(" ").replace(/^\+ /, "") || "selección" };
}

/**
 * Calcula el precio recorriendo los componentes en orden. Cada % declara su base
 * de cálculo; los descuentos restan; el pago al quicker se calcula sobre los
 * componentes marcados (countsForPayout).
 */
export function computeComponents(
  components: ComponentDef[],
  payout: PayoutConfig,
  params: PriceParams,
): ComponentBreakdown {
  const ordered = [...components].sort((a, b) => a.order - b.order);
  const amounts = new Map<string, number>();
  let base = 0;
  let subtotal = 0;
  const lines: PriceLine[] = [];

  for (const c of ordered) {
    if (!conditionHolds(c, params)) {
      amounts.set(c.code, 0);
      continue;
    }
    let amount = 0;
    let formula = "";

    if (c.nature === "base") {
      amount =
        c.valueType === "table" ? Math.round(c.durationTable?.[String(params.duration)] ?? 0) : Math.round(c.value);
      base = amount;
      formula = c.valueType === "table" ? `base para ${params.duration}h` : "valor base";
    } else if (c.valueType === "fixed") {
      const raw = Math.round(c.value);
      amount = c.nature === "discount" ? -raw : raw;
      formula = "valor fijo";
    } else {
      // porcentaje
      const b = calcBase(c, base, subtotal, amounts);
      const raw = Math.round(b.value * c.value);
      amount = c.nature === "discount" ? -raw : raw;
      formula = `${pctStr(c.value)} de ${b.label}`;
    }

    subtotal += amount;
    amounts.set(c.code, amount);
    lines.push({
      code: c.code,
      label: c.label,
      nature: c.nature,
      amount,
      formula,
      countsForPayout: c.countsForPayout,
      visibleToClient: c.visibleToClient,
    });
  }

  const total = subtotal;
  const payoutBase = lines.filter((l) => l.countsForPayout).reduce((s, l) => s + l.amount, 0);
  const payoutAmount = payout.type === "fixed" ? Math.round(payout.value) : Math.round(payoutBase * payout.value);

  return {
    lines,
    total,
    payoutBase,
    payoutType: payout.type,
    payoutValue: payout.value,
    payout: payoutAmount,
  };
}

/**
 * Convierte las reglas del modelo antiguo al modelo de componentes, preservando
 * exactamente el cálculo: size % sobre base, frequency % sobre subtotal (base+size),
 * holiday % sobre subtotal (mano de obra), insumos/comisión fijos sin pago.
 */
export function rulesToComponents(rules: PriceRule[]): { components: ComponentDef[]; payout: PayoutConfig } {
  const components: ComponentDef[] = [];
  let order = 1;

  const durationTable: Record<string, number> = {};
  for (const r of rules.filter((r) => r.dimension === "duration")) durationTable[r.key] = r.value;
  components.push({
    code: "base",
    order: order++,
    label: "Mano de obra base",
    nature: "base",
    valueType: "table",
    value: 0,
    durationTable,
    appliesOn: "base",
    countsForPayout: true,
    visibleToClient: true,
  });

  for (const r of rules.filter((r) => r.dimension === "size")) {
    const delta = r.value - 1; // multiplicador → % de cambio
    if (delta === 0) continue;
    components.push({
      code: `size_${r.key}`,
      order: order++,
      label: `Ajuste tamaño ${r.key}`,
      nature: delta >= 0 ? "cost" : "discount",
      valueType: "percent",
      value: Math.abs(delta),
      appliesOn: "base",
      condParam: "size",
      condValue: r.key,
      countsForPayout: true,
      visibleToClient: true,
    });
  }

  for (const r of rules.filter((r) => r.dimension === "frequency")) {
    if (r.value === 0) continue;
    components.push({
      code: `freq_${r.key}`,
      order: order++,
      label: `Descuento ${r.key}`,
      nature: "discount",
      valueType: "percent",
      value: r.value,
      appliesOn: "subtotal", // sobre base+tamaño (= mano de obra ajustada)
      condParam: "frequency",
      condValue: r.key,
      countsForPayout: true,
      visibleToClient: true,
    });
  }

  const holiday = rules.find((r) => r.dimension === "holiday");
  if (holiday) {
    components.push({
      code: "festivo",
      order: order++,
      label: "Recargo festivo",
      nature: "cost",
      valueType: "percent",
      value: holiday.value,
      appliesOn: "subtotal", // sobre la mano de obra (base+size−freq)
      condParam: "holiday",
      condValue: "true",
      countsForPayout: true,
      visibleToClient: true,
    });
  }

  const supplies = rules.find((r) => r.dimension === "supplies");
  if (supplies) {
    components.push({
      code: "insumos",
      order: order++,
      label: "Insumos",
      nature: "cost",
      valueType: "fixed",
      value: supplies.value,
      appliesOn: "base",
      condParam: "supplies",
      condValue: "true",
      countsForPayout: false,
      visibleToClient: true,
    });
  }

  const platform = rules.find((r) => r.dimension === "platform_fee");
  if (platform) {
    components.push({
      code: "comision",
      order: order++,
      label: "Comisión plataforma",
      nature: "cost",
      valueType: "fixed",
      value: platform.value,
      appliesOn: "base",
      countsForPayout: false,
      visibleToClient: true,
    });
  }

  const payoutRule = rules.find((r) => r.dimension === "payout_pct");
  return { components, payout: { type: "percent", value: payoutRule?.value ?? 0.7 } };
}
