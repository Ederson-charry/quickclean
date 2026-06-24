import { describe, expect, it } from "vitest";
import { type AuditContent, type ChainRow, auditHash, GENESIS, verifyEntries } from "./audit.hash";

function content(action: string, over: Partial<AuditContent> = {}): AuditContent {
  return {
    occurredAt: new Date("2026-06-24T12:00:00.000Z"),
    actorId: null,
    actorRole: null,
    action,
    resourceType: null,
    resourceId: null,
    outcome: "success",
    ip: null,
    userAgent: null,
    before: null,
    after: null,
    metadata: null,
    requestId: null,
    ...over,
  };
}

/** Construye una cadena válida en memoria (sin tocar el DB append-only). */
function buildChain(actions: string[]): ChainRow[] {
  const rows: ChainRow[] = [];
  let prev = GENESIS;
  actions.forEach((a, i) => {
    const c = content(a);
    const hashSelf = auditHash(c, prev);
    rows.push({ ...c, seq: BigInt(i + 1), hashPrev: prev, hashSelf });
    prev = hashSelf;
  });
  return rows;
}

describe("auditHash", () => {
  it("es determinista e independiente del orden de claves en metadata", () => {
    const a = content("x", { metadata: { b: 2, a: 1 } });
    const b = content("x", { metadata: { a: 1, b: 2 } });
    expect(auditHash(a, GENESIS)).toBe(auditHash(b, GENESIS));
  });

  it("cambia si cambia el contenido o el hashPrev", () => {
    expect(auditHash(content("x"), GENESIS)).not.toBe(auditHash(content("y"), GENESIS));
    expect(auditHash(content("x"), GENESIS)).not.toBe(auditHash(content("x"), "otroprev"));
  });
});

describe("verifyEntries", () => {
  it("acepta una cadena válida", () => {
    expect(verifyEntries(buildChain(["auth.login", "auth.refresh", "auth.logout"])).ok).toBe(true);
  });

  it("detecta contenido alterado (hashSelf no coincide)", () => {
    const chain = buildChain(["a", "b", "c"]);
    chain[1] = { ...chain[1], action: "TAMPERED" }; // altera sin recomputar el hash
    const r = verifyEntries(chain);
    expect(r.ok).toBe(false);
    expect(r.brokenAtSeq).toBe("2");
  });

  it("detecta un eslabón roto (hashPrev no enlaza)", () => {
    const chain = buildChain(["a", "b", "c"]);
    chain[2] = { ...chain[2], hashPrev: "no-enlaza" };
    const r = verifyEntries(chain);
    expect(r.ok).toBe(false);
    expect(r.brokenAtSeq).toBe("3");
  });

  it("detecta un evento eliminado del medio (rompe el enlace siguiente)", () => {
    const chain = buildChain(["a", "b", "c"]);
    const withoutMiddle = [chain[0], chain[2]];
    expect(verifyEntries(withoutMiddle).ok).toBe(false);
  });
});
