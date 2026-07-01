import { describe, expect, it } from "vitest";
import { isColombianHoliday } from "./holidays";

// Fechas a mediodía Bogotá (UTC-5 → 17:00Z) para evitar bordes de zona horaria.
const bogota = (iso: string) => new Date(`${iso}T17:00:00.000Z`);

describe("isColombianHoliday", () => {
  it("reconoce festivos fijos 2026", () => {
    expect(isColombianHoliday(bogota("2026-01-01"))).toBe(true); // Año Nuevo
    expect(isColombianHoliday(bogota("2026-05-01"))).toBe(true); // Trabajo
    expect(isColombianHoliday(bogota("2026-07-20"))).toBe(true); // Independencia
    expect(isColombianHoliday(bogota("2026-12-25"))).toBe(true); // Navidad
  });

  it("reconoce festivos trasladados (Emiliani) 2026", () => {
    // Reyes: 6 ene 2026 es martes → se traslada al lunes 12 de enero.
    expect(isColombianHoliday(bogota("2026-01-06"))).toBe(false);
    expect(isColombianHoliday(bogota("2026-01-12"))).toBe(true);
  });

  it("reconoce festivos de Semana Santa 2026 (Pascua = 5 abr)", () => {
    expect(isColombianHoliday(bogota("2026-04-02"))).toBe(true); // Jueves Santo
    expect(isColombianHoliday(bogota("2026-04-03"))).toBe(true); // Viernes Santo
  });

  it("un día normal no es festivo", () => {
    expect(isColombianHoliday(bogota("2026-07-21"))).toBe(false);
    expect(isColombianHoliday(bogota("2026-02-10"))).toBe(false);
  });
});
