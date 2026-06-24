import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch, apiUrl } from "@/lib/http";
import { useSession } from "@/stores/session";

export type AuditOutcome = "success" | "failure" | "denied";

export interface AuditEvent {
  id: string;
  seq: string;
  occurredAt: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  outcome: AuditOutcome;
  ip: string | null;
  userAgent: string | null;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
  hashPrev: string;
  hashSelf: string;
}

export interface AuditPage {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFilters {
  action?: string;
  actorId?: string;
  outcome?: AuditOutcome | "";
  ip?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface VerifyResult {
  ok: boolean;
  count: number;
  brokenAtSeq?: string;
  reason?: string;
}

/** Lee el access token (en memoria) para autenticar contra la API de auditoría. */
function authHeaders(): Record<string, string> {
  const token = useSession.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function queryString(f: AuditFilters): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function useAuditLog(filters: AuditFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["audit", filters],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => apiFetch<AuditPage>(`/admin/auditoria${queryString(filters)}`, { headers: authHeaders() }),
  });
}

export function useAuditVerify(enabled: boolean) {
  return useQuery({
    queryKey: ["audit-verify"],
    enabled,
    queryFn: () => apiFetch<VerifyResult>("/admin/auditoria/verify", { headers: authHeaders() }),
  });
}

/** Descarga la bitácora filtrada (CSV o JSON). La exportación se audita en el backend. */
export async function downloadAuditExport(filters: AuditFilters, format: "csv" | "json"): Promise<void> {
  const params = new URLSearchParams({ format });
  for (const k of ["action", "actorId", "outcome", "ip", "from", "to"] as const) {
    const v = filters[k];
    if (v) params.set(k, String(v));
  }
  const res = await fetch(apiUrl(`/admin/auditoria/export?${params.toString()}`), {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auditoria.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
