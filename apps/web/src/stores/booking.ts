import { create } from "zustand";
import type { Booking, Duration, Frequency } from "@/mocks/types";
import { bookingTotal } from "@/lib/pricing";

export type BookingDraft = Partial<Booking> & {
  duration: Duration;
  frequency: Frequency;
  supplies: boolean;
  /** Categoría real del catálogo (cuando el backend está disponible). */
  serviceCategoryId?: string;
  serviceCategoryName?: string;
};
type Draft = BookingDraft;

const initial: Draft = {
  serviceType: "hogar", size: "1-2", frequency: "unico", duration: 6,
  supplies: false, pets: false,
};

type BookingState = {
  step: number;
  data: Draft;
  set: (patch: Partial<Draft>) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  total: () => number;
};

export const useBooking = create<BookingState>((set, get) => ({
  step: 1,
  data: { ...initial },
  set: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  next: () => set((s) => ({ step: Math.min(5, s.step + 1) })),
  back: () => set((s) => ({ step: Math.max(1, s.step - 1) })),
  reset: () => set({ step: 1, data: { ...initial } }),
  total: () => {
    const { duration, frequency, supplies } = get().data;
    return bookingTotal({ duration, frequency, supplies });
  },
}));
