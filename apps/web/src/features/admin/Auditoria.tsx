import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import {
  type AuditEvent,
  type AuditFilters,
  type AuditOutcome,
  downloadAuditExport,
  useAuditLog,
  useAuditVerify,
} from "@/hooks/audit";
import { fechaHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

const PAGE_SIZE = 20;

const OUTCOME = {
  success: { cls: "bg-success/10 text-success", Icon: CheckCircle2, label: "Éxito" },
  failure: { cls: "bg-danger/10 text-danger", Icon: XCircle, label: "Fallo" },
  denied: { cls: "bg-amber-500/10 text-amber-600", Icon: Ban, label: "Denegado" },
} as const;

function OutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  const { cls, Icon, label } = OUTCOME[outcome];
  return (
    <Badge className={cn("gap-1", cls)}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

function Actor({ id, role }: { id: string | null; role: string | null }) {
  if (!id) return <span className="text-faint">Sistema</span>;
  return (
    <span className="font-mono text-xs text-ink" title={id}>
      {id.slice(0, 8)}…{role ? <span className="text-faint"> · {role}</span> : null}
    </span>
  );
}

function Resource({ type, id }: { type: string | null; id: string | null }) {
  if (!type && !id) return <span className="text-faint">—</span>;
  return (
    <span className="font-mono text-xs text-ink-2">
      {type ?? "—"}
      {id ? `:${id.slice(0, 8)}` : ""}
    </span>
  );
}

// ─── Panel de integridad de la cadena ────────────────────────────────────────
function IntegrityPanel({ enabled }: { enabled: boolean }) {
  const { data, isFetching, isError, refetch } = useAuditVerify(enabled);

  let tone = "border-line";
  let Icon = ShieldQuestion;
  let iconCls = "bg-bg text-faint";
  let title = "Integridad sin verificar";
  let detail = "Inicia sesión para verificar la cadena.";

  if (enabled) {
    if (isFetching && !data) {
      Icon = Loader2;
      iconCls = "bg-bg text-ink-2";
      title = "Verificando cadena…";
      detail = "Recalculando los hashes encadenados.";
    } else if (isError) {
      tone = "border-danger/30";
      Icon = ShieldAlert;
      iconCls = "bg-danger/10 text-danger";
      title = "No se pudo verificar";
      detail = "Reintenta la verificación.";
    } else if (data) {
      if (data.ok) {
        tone = "border-success/30";
        Icon = ShieldCheck;
        iconCls = "bg-success/10 text-success";
        title = "Cadena verificada";
        detail = `${data.count} evento${data.count === 1 ? "" : "s"} · sin manipulación detectada.`;
      } else {
        tone = "border-danger/30";
        Icon = ShieldAlert;
        iconCls = "bg-danger/10 text-danger";
        title = "Cadena alterada";
        detail = `Ruptura en seq ${data.brokenAtSeq ?? "?"}${data.reason ? ` · ${data.reason}` : ""}`;
      }
    }
  }

  return (
    <div className={cn("flex items-center gap-4 rounded-xl border bg-surface p-4 shadow-sm sm:p-5", tone)}>
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", iconCls)}>
        <Icon className={cn("size-5", Icon === Loader2 && "animate-spin")} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-base font-semibold leading-tight text-ink sm:text-lg">{title}</p>
        <p className="mt-0.5 truncate text-sm text-ink-2">{detail}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto shrink-0"
        onClick={() => refetch()}
        disabled={!enabled || isFetching}
      >
        <RotateCw className={cn("size-4", isFetching && "animate-spin")} aria-hidden="true" />
        <span className="hidden sm:inline">Re-verificar</span>
      </Button>
    </div>
  );
}

// ─── Barra de filtros ─────────────────────────────────────────────────────────
const EMPTY_FORM = { action: "", actorId: "", outcome: "all", ip: "" };

function Filters({ onApply }: { onApply: (f: Partial<AuditFilters>) => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const apply = () =>
    onApply({
      action: form.action.trim() || undefined,
      actorId: form.actorId.trim() || undefined,
      ip: form.ip.trim() || undefined,
      outcome: form.outcome === "all" ? undefined : (form.outcome as AuditOutcome),
    });

  const clear = () => {
    setForm(EMPTY_FORM);
    onApply({ action: undefined, actorId: undefined, ip: undefined, outcome: undefined });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="f-action" className="text-xs text-ink-2">
          Acción
        </Label>
        <Input id="f-action" placeholder="auth.login" value={form.action} onChange={(e) => set("action")(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-outcome" className="text-xs text-ink-2">
          Resultado
        </Label>
        <Select value={form.outcome} onValueChange={(v) => setForm((f) => ({ ...f, outcome: v ?? "all" }))}>
          <SelectTrigger id="f-outcome">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="success">Éxito</SelectItem>
            <SelectItem value="failure">Fallo</SelectItem>
            <SelectItem value="denied">Denegado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-actor" className="text-xs text-ink-2">
          Actor (ID)
        </Label>
        <Input id="f-actor" placeholder="uuid del usuario" value={form.actorId} onChange={(e) => set("actorId")(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-ip" className="text-xs text-ink-2">
          IP
        </Label>
        <Input id="f-ip" placeholder="190.0.0.1" value={form.ip} onChange={(e) => set("ip")(e.target.value)} />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" className="bg-brand-600 text-white hover:bg-brand-700">
          Aplicar filtros
        </Button>
        <Button type="button" variant="ghost" onClick={clear}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}

// ─── Dialog de detalle ────────────────────────────────────────────────────────
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-line last:border-0">
      <dt className="text-xs font-medium text-ink-2">{label}</dt>
      <dd className="col-span-2 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

function DetailDialog({ event, onClose }: { event: AuditEvent | null; onClose: () => void }) {
  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {event && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <span className="font-mono text-sm">{event.action}</span>
                <OutcomeBadge outcome={event.outcome} />
              </DialogTitle>
            </DialogHeader>
            <dl className="mt-2">
              <DetailRow label="Secuencia">#{event.seq}</DetailRow>
              <DetailRow label="Fecha">{fechaHora(event.occurredAt)}</DetailRow>
              <DetailRow label="Actor">
                {event.actorId ? (
                  <span className="font-mono text-xs">{event.actorId}</span>
                ) : (
                  "Sistema"
                )}
                {event.actorRole ? ` · ${event.actorRole}` : ""}
              </DetailRow>
              <DetailRow label="Recurso">
                {event.resourceType ? (
                  <span className="font-mono text-xs">
                    {event.resourceType}
                    {event.resourceId ? `:${event.resourceId}` : ""}
                  </span>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="IP">{event.ip ?? "—"}</DetailRow>
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <DetailRow label="Metadata">
                  <pre className="overflow-x-auto rounded-lg bg-bg p-2 font-mono text-xs text-ink-2">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </DetailRow>
              )}
              <DetailRow label="hashPrev">
                <span className="break-all font-mono text-[11px] text-faint">{event.hashPrev}</span>
              </DetailRow>
              <DetailRow label="hashSelf">
                <span className="break-all font-mono text-[11px] text-ink-2">{event.hashSelf}</span>
              </DetailRow>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Auditoria() {
  const accessToken = useSession((s) => s.accessToken);
  const enabled = !!accessToken;
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [detail, setDetail] = useState<AuditEvent | null>(null);
  const [exporting, setExporting] = useState<null | "csv" | "json">(null);

  const { data, isLoading, isError, refetch } = useAuditLog(filters, enabled);

  const applyFilters = (f: Partial<AuditFilters>) => setFilters((prev) => ({ ...prev, ...f, page: 1 }));
  const goPage = (page: number) => setFilters((prev) => ({ ...prev, page }));

  const onExport = async (format: "csv" | "json") => {
    setExporting(format);
    try {
      await downloadAuditExport(filters, format);
      toast.success(`Bitácora exportada (${format.toUpperCase()})`);
    } catch {
      toast.error("No se pudo exportar la bitácora");
    } finally {
      setExporting(null);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: ColumnDef<AuditEvent, unknown>[] = [
    {
      id: "occurredAt",
      header: "Fecha",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-ink-2">
          {fechaHora(row.original.occurredAt)}
        </span>
      ),
    },
    {
      id: "action",
      header: "Acción",
      enableSorting: false,
      cell: ({ row }) => <span className="font-mono text-xs font-medium text-ink">{row.original.action}</span>,
    },
    {
      id: "actor",
      header: "Actor",
      enableSorting: false,
      cell: ({ row }) => <Actor id={row.original.actorId} role={row.original.actorRole} />,
    },
    {
      id: "resource",
      header: "Recurso",
      enableSorting: false,
      cell: ({ row }) => <Resource type={row.original.resourceType} id={row.original.resourceId} />,
    },
    {
      id: "outcome",
      header: "Resultado",
      enableSorting: false,
      cell: ({ row }) => <OutcomeBadge outcome={row.original.outcome} />,
    },
    {
      id: "ip",
      header: "IP",
      enableSorting: false,
      cell: ({ row }) => <span className="font-mono text-xs text-faint">{row.original.ip ?? "—"}</span>,
    },
    {
      id: "ver",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon-sm" aria-label="Ver detalle" onClick={() => setDetail(row.original)}>
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Auditoría</h1>
        <p className="mt-1 text-sm text-ink-2">Bitácora inmutable, encadenada por hash y verificable.</p>
      </header>

      <IntegrityPanel enabled={enabled} />

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            title="Acceso restringido"
            hint="Inicia sesión como administrador con permiso audit.read para consultar la bitácora."
          />
        </div>
      ) : (
        <>
          <Filters onApply={applyFilters} />

          {isLoading ? (
            <LoadingState rows={6} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : total === 0 ? (
            <div className="rounded-xl border border-line bg-surface">
              <EmptyState title="Sin eventos" hint="No hay registros para los filtros seleccionados." />
            </div>
          ) : (
            <>
              {/* Barra de exportación (usa los filtros aplicados) */}
              <div className="flex items-center justify-end gap-2">
                <span className="mr-1 text-xs text-faint">Exportar:</span>
                <Button variant="outline" size="sm" onClick={() => onExport("csv")} disabled={!!exporting}>
                  <Download className="size-4" aria-hidden="true" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => onExport("json")} disabled={!!exporting}>
                  <Download className="size-4" aria-hidden="true" /> JSON
                </Button>
              </div>

              {/* Escritorio: tabla densa */}
              <div className="hidden md:block">
                <DataTable columns={columns} data={items} pageSize={Math.max(items.length, 1)} />
              </div>

              {/* Móvil: tarjetas (sin scroll horizontal) */}
              <ul className="flex flex-col gap-3 md:hidden">
                {items.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => setDetail(ev)}
                      className="w-full rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition-colors hover:border-brand-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-sm font-medium text-ink">{ev.action}</span>
                        <OutcomeBadge outcome={ev.outcome} />
                      </div>
                      <p className="mt-1 font-mono text-xs tabular-nums text-faint">{fechaHora(ev.occurredAt)}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div>
                          <dt className="text-faint">Actor</dt>
                          <dd className="mt-0.5">
                            <Actor id={ev.actorId} role={ev.actorRole} />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-faint">IP</dt>
                          <dd className="mt-0.5 font-mono text-ink-2">{ev.ip ?? "—"}</dd>
                        </div>
                      </dl>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Paginación del servidor */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-faint">
                  {total} evento{total === 1 ? "" : "s"} · página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => goPage(page - 1)}
                    disabled={page <= 1}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => goPage(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <DetailDialog event={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
