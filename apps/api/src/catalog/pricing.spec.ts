import { describe, expect, it } from "vitest";
import { type PriceRule, computePrice } from "./pricing";

const RULES: PriceRule[] = [
  { dimension: "duration", key: "4", modifierType: "base", value: 79_900 },
  { dimension: "duration", key: "6", modifierType: "base", value: 109_900 },
  { dimension: "frequency", key: "unica", modifierType: "percent", value: 0 },
  { dimension: "frequency", key: "semanal", modifierType: "percent", value: 0.2 },
  { dimension: "size", key: "S", modifierType: "multiplier", value: 1 },
  { dimension: "size", key: "L", modifierType: "multiplier", value: 1.3 },
  { dimension: "supplies", key: "", modifierType: "flat", value: 15_000 },
  { dimension: "platform_fee", key: "", modifierType: "flat", value: 6_900 },
  { dimension: "payout_pct", key: "", modifierType: "percent", value: 0.7 },
];

describe("computePrice", () => {
  it("precio base + fee, sin tamaño/frecuencia/insumos", () => {
    const r = computePrice(RULES, { duration: 4, frequency: "unica", size: "S", supplies: false });
    expect(r.labor).toBe(79_900);
    expect(r.total).toBe(79_900 + 6_900);
    expect(r.payout).toBe(Math.round(79_900 * 0.7));
  });

  it("el tamaño SÍ influye (corrige el bug del demo)", () => {
    const r = computePrice(RULES, { duration: 4, frequency: "unica", size: "L", supplies: false });
    expect(r.sizeMultiplier).toBe(1.3);
    expect(r.labor).toBe(Math.round(79_900 * 1.3));
  });

  it("aplica descuento por frecuencia sobre la mano de obra", () => {
    const r = computePrice(RULES, { duration: 4, frequency: "semanal", size: "S", supplies: false });
    expect(r.frequencyDiscount).toBe(0.2);
    expect(r.labor).toBe(Math.round(79_900 * 0.8));
  });

  it("suma insumos sólo cuando se piden", () => {
    const con = computePrice(RULES, { duration: 6, frequency: "unica", size: "S", supplies: true });
    const sin = computePrice(RULES, { duration: 6, frequency: "unica", size: "S", supplies: false });
    expect(con.suppliesCost).toBe(15_000);
    expect(con.total - sin.total).toBe(15_000);
  });

  it("usa defaults seguros si faltan reglas", () => {
    const r = computePrice([], { duration: 4, frequency: "unica", size: "S", supplies: true });
    expect(r.base).toBe(0);
    expect(r.sizeMultiplier).toBe(1);
    expect(r.total).toBe(0);
  });

  it("aplica recargo festivo sobre la mano de obra (y al payout)", () => {
    const RULES_H: PriceRule[] = [...RULES, { dimension: "holiday", key: "", modifierType: "percent", value: 0.25 }];
    const normal = computePrice(RULES_H, { duration: 4, frequency: "unica", size: "S", supplies: false });
    const festivo = computePrice(RULES_H, { duration: 4, frequency: "unica", size: "S", supplies: false, holiday: true });
    expect(normal.holidaySurcharge).toBe(0);
    expect(festivo.holidaySurcharge).toBe(Math.round(normal.labor * 0.25));
    expect(festivo.total).toBe(normal.total + festivo.holidaySurcharge);
    expect(festivo.payout).toBeGreaterThan(normal.payout);
  });

  it("sin regla holiday, holiday:true no cambia el precio", () => {
    const r = computePrice(RULES, { duration: 4, frequency: "unica", size: "S", supplies: false, holiday: true });
    expect(r.holidaySurcharge).toBe(0);
  });
});
