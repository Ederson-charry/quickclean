import { describe, it, expect } from "vitest";
import { cop } from "@/lib/format";

describe("cop", () => {
  it("formats COP with no decimals", () => {
    expect(cop(116800).replace(/\s/g, " ")).toMatch(/\$\s?116\.800/);
  });
});
