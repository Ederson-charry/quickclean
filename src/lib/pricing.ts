import type { Duration, Frequency } from "@/mocks/types";

export const PLATFORM_FEE = 6900;
export const SUPPLIES_FEE = 15000;

export function basePrice(duration: Duration): number {
  return { 4: 79900, 6: 109900, 8: 139900 }[duration];
}

export function discount(frequency: Frequency): number {
  return { unico: 0, semanal: 0.2, quincenal: 0.12, mensual: 0.08 }[frequency];
}

export function serviceValue(input: { duration: Duration; frequency: Frequency }): number {
  return Math.round(basePrice(input.duration) * (1 - discount(input.frequency)));
}

export function bookingTotal(input: { duration: Duration; frequency: Frequency; supplies: boolean }): number {
  return serviceValue(input) + (input.supplies ? SUPPLIES_FEE : 0) + PLATFORM_FEE;
}

export function quickerPayout(input: { duration: Duration; frequency: Frequency }): number {
  return Math.round(serviceValue(input) * 0.7);
}
