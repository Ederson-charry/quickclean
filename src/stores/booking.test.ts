import { describe, it, expect, beforeEach } from "vitest";
import { useBooking } from "@/stores/booking";

describe("booking store", () => {
  beforeEach(() => useBooking.getState().reset());
  it("starts at step 1 with default duration 6", () => {
    expect(useBooking.getState().step).toBe(1);
    expect(useBooking.getState().data.duration).toBe(6);
  });
  it("next/back move within 1..5", () => {
    useBooking.getState().back();
    expect(useBooking.getState().step).toBe(1);
    useBooking.getState().next(); useBooking.getState().next();
    expect(useBooking.getState().step).toBe(3);
  });
  it("total reflects current selections", () => {
    useBooking.getState().set({ duration: 6, frequency: "unico", supplies: false });
    expect(useBooking.getState().total()).toBe(116800);
  });
});
