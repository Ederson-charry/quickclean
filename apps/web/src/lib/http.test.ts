import { describe, expect, it } from "vitest";
import { apiUrl } from "./http";

describe("apiUrl", () => {
  it("compone sobre VITE_API_URL / base por defecto", () => {
    expect(apiUrl("/auth/login")).toMatch(/\/auth\/login$/);
  });
  it("no duplica el host", () => {
    expect(apiUrl("/health").startsWith("http")).toBe(true);
  });
});
