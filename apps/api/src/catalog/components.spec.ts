import { describe, expect, it } from "vitest";
import { type ComponentDef, computeComponents, rulesToComponents } from "./components";
import { type PriceRule, computePrice } from "./pricing";

const P = { duration: 4, frequency: "unica", size: "M", supplies: false, holiday: false };

describe("computeComponents — modelo composable", () => {
  it("reproduce el ejemplo de la hoja (base + costos + % de selección + pago sobre selección)", () => {
    const comps: ComponentDef[] = [
      { code: "base", order: 1, label: "base", nature: "base", valueType: "fixed", value: 50, appliesOn: "base", countsForPayout: true, visibleToClient: true },
      { code: "implementos", order: 2, label: "implementos", nature: "cost", valueType: "fixed", value: 10, appliesOn: "base", countsForPayout: true, visibleToClient: true },
      { code: "x", order: 3, label: "x", nature: "cost", valueType: "fixed", value: 60, appliesOn: "base", countsForPayout: true, visibleToClient: true },
      {
        code: "y",
        order: 4,
        label: "y",
        nature: "cost",
        valueType: "percent",
        value: 0.1,
        appliesOn: "selection",
        appliesOnRefs: [{ code: "base", op: "add" }, { code: "implementos", op: "add" }],
        countsForPayout: false, // y NO suma al pago del quicker
        visibleToClient: true,
      },
    ];
    const r = computeComponents(comps, { type: "percent", value: 0.7 }, P);
    // total = 50 + 10 + 60 + (10% de 60 = 6) = 126
    expect(r.total).toBe(126);
    // base de pago = base + implementos + x = 120 (excluye y) → 70% = 84
    expect(r.payoutBase).toBe(120);
    expect(r.payout).toBe(84);
  });

  it("un descuento resta del total; la selección soporta restar", () => {
    const comps: ComponentDef[] = [
      { code: "base", order: 1, label: "base", nature: "base", valueType: "fixed", value: 100, appliesOn: "base", countsForPayout: true, visibleToClient: true },
      { code: "promo", order: 2, label: "promo", nature: "discount", valueType: "fixed", value: 20, appliesOn: "base", countsForPayout: true, visibleToClient: true },
      {
        code: "recargo",
        order: 3,
        label: "recargo",
        nature: "cost",
        valueType: "percent",
        value: 0.1,
        appliesOn: "selection",
        appliesOnRefs: [{ code: "base", op: "add" }, { code: "promo", op: "add" }], // 100 + (−20) = 80
        countsForPayout: true,
        visibleToClient: true,
      },
    ];
    const r = computeComponents(comps, { type: "percent", value: 0.5 }, P);
    // total = 100 − 20 + (10% de 80 = 8) = 88
    expect(r.total).toBe(88);
    expect(r.payout).toBe(44); // 50% de 88
  });

  it("una condición que no se cumple omite el componente", () => {
    const comps: ComponentDef[] = [
      { code: "base", order: 1, label: "base", nature: "base", valueType: "fixed", value: 100, appliesOn: "base", countsForPayout: true, visibleToClient: true },
      { code: "festivo", order: 2, label: "festivo", nature: "cost", valueType: "percent", value: 0.3, appliesOn: "base", condParam: "holiday", condValue: "true", countsForPayout: true, visibleToClient: true },
    ];
    expect(computeComponents(comps, { type: "percent", value: 0.7 }, { ...P, holiday: false }).total).toBe(100);
    expect(computeComponents(comps, { type: "percent", value: 0.7 }, { ...P, holiday: true }).total).toBe(130);
  });
});

// Paridad: el motor de componentes (migrado) debe dar lo mismo que el motor de reglas.
describe("rulesToComponents — paridad con el motor de reglas", () => {
  const RULES: PriceRule[] = [
    { dimension: "duration", key: "4", modifierType: "base", value: 79_900 },
    { dimension: "duration", key: "6", modifierType: "base", value: 109_900 },
    { dimension: "frequency", key: "unica", modifierType: "percent", value: 0 },
    { dimension: "frequency", key: "semanal", modifierType: "percent", value: 0.2 },
    { dimension: "size", key: "S", modifierType: "multiplier", value: 1 },
    { dimension: "size", key: "M", modifierType: "multiplier", value: 1.15 },
    { dimension: "size", key: "L", modifierType: "multiplier", value: 1.3 },
    { dimension: "supplies", key: "", modifierType: "flat", value: 15_000 },
    { dimension: "platform_fee", key: "", modifierType: "flat", value: 6_900 },
    { dimension: "payout_pct", key: "", modifierType: "percent", value: 0.7 },
    { dimension: "holiday", key: "", modifierType: "percent", value: 0.35 },
  ];
  const { components, payout } = rulesToComponents(RULES);

  const cases = [
    { duration: 4, frequency: "unica", size: "S", supplies: false, holiday: false },
    { duration: 4, frequency: "unica", size: "M", supplies: true, holiday: false },
    { duration: 6, frequency: "semanal", size: "L", supplies: true, holiday: true },
    { duration: 6, frequency: "unica", size: "M", supplies: false, holiday: true },
  ];

  for (const p of cases) {
    it(`coincide total y payout — ${JSON.stringify(p)}`, () => {
      const legacy = computePrice(RULES, p);
      const modern = computeComponents(components, payout, p);
      expect(modern.total).toBe(legacy.total);
      expect(modern.payout).toBe(legacy.payout);
    });
  }
});
