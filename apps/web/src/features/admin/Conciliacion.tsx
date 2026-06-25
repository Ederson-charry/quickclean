import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownToLine, Banknote, Percent, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import {
  type ReconItem,
  downloadReconciliation,
  useReconciliation,
} from "@/hooks/catalog";
import { cop, fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

function SummaryCard({ icon: Icon, label, value, accent }: { icon: typeof Banknote; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-ink-2">
        <Icon className={cn("size-4", accent ?? "text-brand-600")} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

export default function Conciliacion() {
  const enabled = !!useSession((s) => s.accessToken);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<{ from?: string; to?: string }>({});
  const [exporting, setExporting] = useState<null | "csv" | "json">(null);

  const { data, isLoading, isError, refetch } = useReconciliation(applied.from, applied.to, enabled);

  const onExport = async (format: "csv" | "json") => {
    setExporting(format);
    try {
      await downloadReconciliation(applied.from, applied.to, format);
      toast.success(`Reporte exportado (${format.toUpperCase()})`);
    } catch {
      toast.error("No se pudo exportar el reporte");
    } finally {
      setExporting(null);
    }
  };

  const columns: ColumnDef<ReconItem, unknown>[] = [
    {
      id: "fecha",
      header: "Fecha",
      enableSorting: false,
      cell: ({ row }) => <span className="whitespace-nowrap text-xs text-ink-2">{fechaCorta(row.original.scheduledAt)}</span>,
    },
    { id: "cliente", header: "Cliente", enableSorting: false, cell: ({ row }) => <span className="text-sm text-ink">{row.original.client ?? "—"}</span> },
    { id: "servicio", header: "Servicio", enableSorting: false, cell: ({ row }) => <span className="text-sm text-ink-2">{row.original.service ?? "—"}</span> },
    { id: "quicker", header: "Quicker", enableSorting: false, cell: ({ row }) => <span className="text-sm text-ink-2">{row.original.quicker ?? "—"}</span> },
    {
      id: "cobro",
      header: "Cobro",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm font-medium tabular-nums text-ink">{cop(row.original.cobro)}</span>,
    },
    {
      id: "pago",
      header: "Pago quicker",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm tabular-nums text-ink-2">{cop(row.original.pago)}</span>,
    },
    {
      id: "comision",
      header: "Comisión",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm tabular-nums text-success">{cop(row.original.comision)}</span>,
    },
    {
      id: "liquidacion",
      header: "Pago",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge className={row.original.liquidacion === "liquidado" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"}>
          {row.original.liquidacion === "liquidado" ? "Liquidado" : "Pendiente"}
        </Badge>
      ),
    },
  ];

  const items = data?.items ?? [];
  const s = data?.summary;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Conciliación GAF/ERP</h1>
        <p className="mt-1 text-sm text-ink-2">
          Cobro a clientes y pago a quickers por servicio — insumo para facturación y nómina del ERP.
        </p>
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (erp.read)." />
        </div>
      ) : (
        <>
          {/* Filtro de periodo + export */}
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs text-ink-2">Desde</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs text-ink-2">Hasta</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
            </div>
            <Button className="bg-brand-600 text-white hover:bg-brand-700" onClick={() => setApplied({ from: from || undefined, to: to || undefined })}>
              Aplicar
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => onExport("csv")}>
                <ArrowDownToLine className="size-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" disabled={!!exporting} onClick={() => onExport("json")}>
                <ArrowDownToLine className="size-4" /> JSON
              </Button>
            </div>
          </div>

          {isLoading ? (
            <LoadingState rows={5} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard icon={Receipt} label="Cobrado a clientes" value={cop(s?.totalCobro ?? 0)} />
                <SummaryCard icon={Wallet} label="Pagado a quickers" value={cop(s?.totalPago ?? 0)} accent="text-amber-600" />
                <SummaryCard icon={Percent} label="Comisión plataforma" value={cop(s?.totalComision ?? 0)} accent="text-success" />
                <SummaryCard icon={Banknote} label="Servicios" value={String(s?.count ?? 0)} />
              </div>

              {items.length === 0 ? (
                <div className="rounded-xl border border-line bg-surface">
                  <EmptyState title="Sin movimientos" hint="No hay servicios completados en el periodo." />
                </div>
              ) : (
                <>
                  {/* Escritorio: tabla */}
                  <div className="hidden md:block">
                    <DataTable columns={columns} data={items} pageSize={Math.max(items.length, 1)} />
                  </div>
                  {/* Móvil: tarjetas */}
                  <ul className="flex flex-col gap-3 md:hidden">
                    {items.map((i) => (
                      <li key={i.bookingId} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-ink">{i.service ?? "—"}</span>
                          <Badge className={i.liquidacion === "liquidado" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"}>
                            {i.liquidacion === "liquidado" ? "Liquidado" : "Pendiente"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-faint">{fechaCorta(i.scheduledAt)} · {i.client}</p>
                        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div><dt className="text-faint">Cobro</dt><dd className="mt-0.5 font-medium tabular-nums text-ink">{cop(i.cobro)}</dd></div>
                          <div><dt className="text-faint">Pago</dt><dd className="mt-0.5 tabular-nums text-ink-2">{cop(i.pago)}</dd></div>
                          <div><dt className="text-faint">Comisión</dt><dd className="mt-0.5 tabular-nums text-success">{cop(i.comision)}</dd></div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
