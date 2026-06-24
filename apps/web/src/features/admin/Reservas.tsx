import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
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
import { type AdminBooking, useAdminReservations } from "@/hooks/catalog";
import { cop, fechaHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

const STATUS = {
  agendado: { cls: "bg-brand-100 text-brand-700", label: "Agendado" },
  en_curso: { cls: "bg-warning/10 text-warning", label: "En curso" },
  completado: { cls: "bg-success/10 text-success", label: "Completado" },
  cancelado: { cls: "bg-danger/10 text-danger", label: "Cancelado" },
} as const;

function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const s = STATUS[status];
  return <Badge className={cn("font-medium", s.cls)}>{s.label}</Badge>;
}

export default function Reservas() {
  const enabled = !!useSession((s) => s.accessToken);
  const [status, setStatus] = useState("all");
  const { data, isLoading, isError, refetch } = useAdminReservations(status === "all" ? "" : status, enabled);

  const items = data ?? [];

  const columns: ColumnDef<AdminBooking, unknown>[] = [
    {
      id: "scheduledAt",
      header: "Fecha",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-ink-2">
          {fechaHora(row.original.scheduledAt)}
        </span>
      ),
    },
    {
      id: "client",
      header: "Cliente",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-ink">{row.original.client?.email ?? "—"}</span>,
    },
    {
      id: "category",
      header: "Servicio",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-ink">{row.original.category?.name ?? "—"}</span>,
    },
    {
      id: "duration",
      header: "Duración",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-ink-2">{row.original.duration}h</span>,
    },
    {
      id: "total",
      header: "Total",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm font-medium tabular-nums text-ink">{cop(row.original.priceTotal)}</span>,
    },
    {
      id: "status",
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Reservas</h1>
        <p className="mt-1 text-sm text-ink-2">Servicios agendados por los clientes.</p>
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (booking.read)." />
        </div>
      ) : (
        <>
          <div className="max-w-xs space-y-1.5">
            <Label className="text-xs text-ink-2">Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="en_curso">En curso</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingState rows={5} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface">
              <EmptyState title="Sin reservas" hint="No hay reservas para el estado seleccionado." />
            </div>
          ) : (
            <>
              {/* Escritorio: tabla */}
              <div className="hidden md:block">
                <DataTable columns={columns} data={items} pageSize={Math.max(items.length, 1)} />
              </div>

              {/* Móvil: tarjetas */}
              <ul className="flex flex-col gap-3 md:hidden">
                {items.map((b) => (
                  <li key={b.id} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-ink">{b.category?.name ?? "—"}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 font-mono text-xs tabular-nums text-faint">{fechaHora(b.scheduledAt)}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div>
                        <dt className="text-faint">Cliente</dt>
                        <dd className="mt-0.5 truncate text-ink-2">{b.client?.email ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-faint">Total</dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-ink">{cop(b.priceTotal)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
