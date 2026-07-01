/**
 * Festivos de Colombia (Ley 51 de 1983 — "Ley Emiliani"). Algunos festivos se
 * trasladan al lunes siguiente; otros son fijos. Los relativos a Pascua se
 * calculan desde el domingo de Resurrección. Colombia es UTC-5 todo el año.
 */

const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Componentes de la fecha en hora de Bogotá (para no fallar por zona horaria). */
function bogotaYMD(date: Date): { y: number; m: number; d: number } {
  const b = new Date(date.getTime() - BOGOTA_OFFSET_MS);
  return { y: b.getUTCFullYear(), m: b.getUTCMonth() + 1, d: b.getUTCDate() };
}

/** Domingo de Resurrección (algoritmo de Butcher/Meeus). */
function easterSunday(year: number): { m: number; d: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const dd = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const mth = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * mth + 114) / 31); // 3=marzo, 4=abril
  const day = ((h + l - 7 * mth + 114) % 31) + 1;
  return { m: month, d: day };
}

function ymdToUTC(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d);
}

/** Traslada al lunes siguiente si no cae en lunes (regla Emiliani). */
function toNextMonday(ms: number): number {
  const dow = new Date(ms).getUTCDay(); // 0=dom … 1=lun
  if (dow === 1) return ms;
  const add = (8 - dow) % 7; // días hasta el próximo lunes
  return ms + add * 86_400_000;
}

/** Conjunto de festivos (YYYY-M-D en UTC) del año dado. */
function holidaySet(year: number): Set<number> {
  const set = new Set<number>();
  // Fijos (no se trasladan)
  const fixed: [number, number][] = [
    [1, 1], // Año Nuevo
    [5, 1], // Día del Trabajo
    [7, 20], // Independencia
    [8, 7], // Batalla de Boyacá
    [12, 8], // Inmaculada Concepción
    [12, 25], // Navidad
  ];
  for (const [m, d] of fixed) set.add(ymdToUTC(year, m, d));

  // Emiliani (se trasladan al lunes)
  const emiliani: [number, number][] = [
    [1, 6], // Reyes Magos
    [3, 19], // San José
    [6, 29], // San Pedro y San Pablo
    [8, 15], // Asunción de la Virgen
    [10, 12], // Día de la Raza
    [11, 1], // Todos los Santos
    [11, 11], // Independencia de Cartagena
  ];
  for (const [m, d] of emiliani) set.add(toNextMonday(ymdToUTC(year, m, d)));

  // Relativos a Pascua
  const e = easterSunday(year);
  const easterMs = ymdToUTC(year, e.m, e.d);
  set.add(easterMs - 3 * 86_400_000); // Jueves Santo (fijo)
  set.add(easterMs - 2 * 86_400_000); // Viernes Santo (fijo)
  set.add(toNextMonday(easterMs + 43 * 86_400_000)); // Ascensión
  set.add(toNextMonday(easterMs + 64 * 86_400_000)); // Corpus Christi
  set.add(toNextMonday(easterMs + 71 * 86_400_000)); // Sagrado Corazón

  return set;
}

/** ¿La fecha (hora Bogotá) es festivo en Colombia? */
export function isColombianHoliday(date: Date): boolean {
  const { y, m, d } = bogotaYMD(date);
  return holidaySet(y).has(ymdToUTC(y, m, d));
}
