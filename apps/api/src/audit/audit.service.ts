import { Injectable } from "@nestjs/common";
import { type AuditLog, type Prisma, Prisma as PrismaNS } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  type AuditContent,
  type AuditOutcomeValue,
  auditHash,
  GENESIS,
  verifyEntries,
} from "./audit.hash";

// Clave fija para serializar los appends con pg_advisory_xact_lock (evita
// que dos inserts concurrentes lean el mismo hashPrev y rompan la cadena).
const ADVISORY_LOCK_KEY = 7_282_025;

export interface AuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  outcome: AuditOutcomeValue;
  ip?: string | null;
  userAgent?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
}

export interface AuditListFilter {
  action?: string;
  actorId?: string;
  outcome?: AuditOutcomeValue;
  ip?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

const toJson = (v: unknown): Prisma.InputJsonValue | typeof PrismaNS.JsonNull =>
  v === null || v === undefined ? PrismaNS.JsonNull : (v as Prisma.InputJsonValue);

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registra un evento encadenado por hash (append-only, serializado). */
  async record(input: AuditInput): Promise<AuditLog> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`;
      const last = await tx.auditLog.findFirst({
        orderBy: { seq: "desc" },
        select: { hashSelf: true },
      });
      const hashPrev = last?.hashSelf ?? GENESIS;
      const occurredAt = new Date();
      const content: AuditContent = {
        occurredAt,
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        outcome: input.outcome,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        before: input.before ?? null,
        after: input.after ?? null,
        metadata: input.metadata ?? null,
        requestId: input.requestId ?? null,
      };
      const hashSelf = auditHash(content, hashPrev);
      return tx.auditLog.create({
        data: {
          occurredAt,
          actorId: content.actorId,
          actorRole: content.actorRole,
          action: content.action,
          resourceType: content.resourceType,
          resourceId: content.resourceId,
          outcome: content.outcome,
          ip: content.ip,
          userAgent: content.userAgent,
          before: toJson(content.before),
          after: toJson(content.after),
          metadata: toJson(content.metadata),
          requestId: content.requestId,
          hashPrev,
          hashSelf,
        },
      });
    });
  }

  async list(filter: AuditListFilter) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filter.action) where.action = filter.action;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.outcome) where.outcome = filter.outcome;
    if (filter.ip) where.ip = filter.ip;
    if (filter.from || filter.to) {
      where.occurredAt = { ...(filter.from && { gte: filter.from }), ...(filter.to && { lte: filter.to }) };
    }
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { seq: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items: rows.map((r) => ({ ...r, seq: r.seq.toString() })), total, page, pageSize };
  }

  /** Recorre toda la cadena y detecta manipulación. */
  async verifyChain() {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { seq: "asc" } });
    const res = verifyEntries(rows);
    return { ok: res.ok, count: rows.length, brokenAtSeq: res.brokenAtSeq, reason: res.reason };
  }
}
