import { describe, it, expect } from "vitest";
import { basePrice, discount, bookingTotal, quickerPayout } from "@/lib/pricing";

describe("pricing", () => {
  it("base prices by duration", () => {
    expect(basePrice(4)).toBe(79900);
    expect(basePrice(6)).toBe(109900);
    expect(basePrice(8)).toBe(139900);
  });
  it("frequency discounts", () => {
    expect(discount("unico")).toBe(0);
    expect(discount("semanal")).toBe(0.2);
    expect(discount("quincenal")).toBe(0.12);
    expect(discount("mensual")).toBe(0.08);
  });
  it("total = round(base*(1-disc)) + supplies + platform fee", () => {
    // 6h unico, no supplies: 109900 + 6900 = 116800
    expect(bookingTotal({ duration: 6, frequency: "unico", supplies: false })).toBe(116800);
    // 6h semanal (-20%) + supplies: round(109900*0.8)=87920 +15000 +6900 = 109820
    expect(bookingTotal({ duration: 6, frequency: "semanal", supplies: true })).toBe(109820);
  });
  it("quicker payout ~70% of service value (base*(1-disc))", () => {
    expect(quickerPayout({ duration: 4, frequency: "unico" })).toBe(Math.round(79900 * 0.7));
  });
});
