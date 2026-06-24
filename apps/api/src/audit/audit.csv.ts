const COLUMNS = [
  "seq",
  "occurredAt",
  "actorId",
  "actorRole",
  "action",
  "resourceType",
  "resourceId",
  "outcome",
  "ip",
  "hashSelf",
] as const;

function cell(value: unknown): string {
  const s = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serializa eventos de auditoría a CSV (cabecera + filas, con escape RFC-4180). */
export function toCsv(rows: Record<string, unknown>[]): string {
  const header = COLUMNS.join(",");
  const lines = rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(","));
  return [header, ...lines].join("\n");
}
