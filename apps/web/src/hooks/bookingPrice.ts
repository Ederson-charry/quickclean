import { usePricePreview, type PriceBreakdown } from "@/hooks/catalog";
import { bookingTotal } from "@/lib/pricing";
import type { Duration, Frequency } from "@/mocks/types";

export interface BookingPriceInput {
  duration: Duration;
  frequency: Frequency;
  supplies: boolean;
  size?: string;
  serviceCategoryId?: string;
}

// Mapea los enums del demo a las claves de las reglas del backend.
const SIZE_MAP: Record<string, string> = { estudio: "S", "1-2": "M", "3+": "L", casa: "L" };
export const mapSize = (s: string | undefined): string => SIZE_MAP[s ?? "1-2"] ?? "M";
export const mapFrequency = (f: string): string => (f === "unico" ? "unica" : f);

export interface BookingPrice {
  total: number;
  breakdown: PriceBreakdown | null;
  isReal: boolean;
}

/**
 * Precio de la reserva: usa el motor real (/catalogo/precio) cuando hay una
 * categoría real seleccionada; si no (o sin backend), cae al cálculo del demo.
 */
export function useBookingPrice(draft: BookingPriceInput): BookingPrice {
  const input = draft.serviceCategoryId
    ? {
        serviceCategoryId: draft.serviceCategoryId,
        duration: draft.duration,
        frequency: mapFrequency(draft.frequency),
        size: mapSize(draft.size),
        supplies: draft.supplies,
      }
    : null;
  const { data: real } = usePricePreview(input);

  if (draft.serviceCategoryId && real) {
    return { total: real.total, breakdown: real, isReal: true };
  }
  return {
    total: bookingTotal({ duration: draft.duration, frequency: draft.frequency, supplies: draft.supplies }),
    breakdown: null,
    isReal: false,
  };
}
