/**
 * Parámetros del Código Sustantivo del Trabajo (CST) para liquidar nómina.
 * Los valores monetarios son **parametrizables por entorno** (decreto de salario
 * mínimo vigente); las tasas de aporte del trabajador son fijas por la Ley 100.
 */
function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export const CST = {
  /** Salario mínimo mensual legal vigente. Default 2025; actualizar al decreto vigente vía CST_SMMLV. */
  get smmlv(): number {
    return envInt("CST_SMMLV", 1_423_500);
  },
  /** Auxilio de transporte mensual. Default 2025; actualizar vía CST_AUX_TRANSPORTE. */
  get auxTransporte(): number {
    return envInt("CST_AUX_TRANSPORTE", 200_000);
  },
  /** Aporte del trabajador a salud (fijo por ley). */
  healthRate: 0.04,
  /** Aporte del trabajador a pensión (fijo por ley). */
  pensionRate: 0.04,
  /** El auxilio de transporte aplica si el salario ≤ N·SMMLV. */
  auxTransporteMaxSmmlv: 2,
} as const;
