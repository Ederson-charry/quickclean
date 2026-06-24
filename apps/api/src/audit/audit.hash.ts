import { createHash } from "node:crypto";

/** Hash inicial de la cadena (no hay evento previo). */
export const GENESIS = "0".repeat(64);

export type AuditOutcomeValue = "success" | "failure" | "denied";

/** Contenido que entra al hash de un evento (excluye id y seq, que asigna el DB). */
export interface AuditContent {
  occurredAt: Date;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  outcome: AuditOutcomeValue;
  ip: string | null;
  userAgent: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  requestId: string | null;
}

/** Serialización determinista: ordena claves recursivamente y normaliza fechas. */
function stableStringify(v: unknown): string {
  if (v === null || v === undefined) {
    return "null";
  }
  if (v instanceof Date) {
    return JSON.stringify(v.toISOString());
  }
  if (typeof v !== "object") {
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    return `[${v.map(stableStringify).join(",")}]`;
  }
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** hashSelf = sha256(contenido_canónico + hashPrev). */
export function auditHash(content: AuditContent, hashPrev: string): string {
  const canonical = stableStringify({
    occurredAt: content.occurredAt,
    actorId: content.actorId ?? null,
    actorRole: content.actorRole ?? null,
    action: content.action,
    resourceType: content.resourceType ?? null,
    resourceId: content.resourceId ?? null,
    outcome: content.outcome,
    ip: content.ip ?? null,
    userAgent: content.userAgent ?? null,
    before: content.before ?? null,
    after: content.after ?? null,
    metadata: content.metadata ?? null,
    requestId: content.requestId ?? null,
  });
  return createHash("sha256").update(canonical + hashPrev).digest("hex");
}

export interface ChainRow extends AuditContent {
  seq: bigint;
  hashPrev: string;
  hashSelf: string;
}

export interface VerifyResult {
  ok: boolean;
  brokenAtSeq?: string;
  reason?: string;
}

/**
 * Verifica una cadena de eventos ordenada por seq ascendente:
 * cada hashPrev debe enlazar con el hashSelf anterior (GENESIS el primero),
 * y el hashSelf debe recomputarse igual (detecta contenido alterado).
 */
export function verifyEntries(rows: ChainRow[]): VerifyResult {
  let prevHash = GENESIS;
  for (const r of rows) {
    if (r.hashPrev !== prevHash) {
      return { ok: false, brokenAtSeq: String(r.seq), reason: "hashPrev no enlaza con el evento anterior" };
    }
    if (auditHash(r, r.hashPrev) !== r.hashSelf) {
      return { ok: false, brokenAtSeq: String(r.seq), reason: "hashSelf no coincide (contenido alterado)" };
    }
    prevHash = r.hashSelf;
  }
  return { ok: true };
}
