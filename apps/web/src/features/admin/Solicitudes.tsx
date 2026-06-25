import { useState } from "react";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Check, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import {
  type AdminLeaveDTO,
  type LeaveKind,
  type LeaveStatus,
  useAdminLeaves,
  useDecideLeave,
} from "@/hooks/catalog";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

const KIND_LABEL: Record<LeaveKind, string> = {
  incapacidad: "Incapacidad",
  licencia: "Licencia",
  vacaciones: "Vacaciones",
};

const STATUS_BADGE: Record<LeaveStatus, { label: string; className: string }> = {
  en_revision: { label: "En revisión", className: "bg-warning/10 text-warning" },
  aprobada: { label: "Aprobada", className: "bg-success/10 text-success" },
  rechazada: { label: "Rechazada", className: "bg-danger/10 text-danger" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "en_revision", label: "En revisión" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "rechazada", label: "Rechazadas" },
  { value: "", label: "Todas" },
];

function LeaveRow({ r }: { r: AdminLeaveDTO }) {
  const decide = useDecideLeave();
  const from = new Date(r.startDate);
  const to = new Date(r.endDate);
  const days = differenceInDays(to, from) + 1;
  const badge = STATUS_BADGE[r.status];
  const pending = r.status === "en_revision";

  const act = (status: "aprobada" | "rechazada") =>
    decide.mutate(
      { id: r.id, status },
      {
        onSuccess: () => toast.success(status === "aprobada" ? "Solicitud aprobada" : "Solicitud rechazada"),
        onError: () => toast.error("No se pudo actualizar"),
      },
    );

  return (
    <li className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-ink">{r.quicker.name}</span>
            <span className="inline-flex items-center gap-1 text-xs text-faint">
              <MapPin className="size-3" /> {r.quicker.zone}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-2">
            <span className="font-medium text-ink">{KIND_LABEL[r.kind]}</span> ·{" "}
            {format(from, "d MMM", { locale: es })} – {format(to, "d MMM yyyy", { locale: es })} · {days} día
            {days !== 1 ? "s" : ""}
          </p>
          {r.reason && <p className="mt-1 text-xs text-faint">{r.reason}</p>}
        </div>
        <Badge className={cn("shrink-0", badge.className)}>{badge.label}</Badge>
      </div>

      {pending && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-success text-white hover:bg-success/90"
            disabled={decide.isPending}
            onClick={() => act("aprobada")}
          >
            <Check className="size-4" /> Aprobar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-danger/40 text-danger hover:bg-danger/5"
            disabled={decide.isPending}
            onClick={() => act("rechazada")}
          >
            <X className="size-4" /> Rechazar
          </Button>
        </div>
      )}
    </li>
  );
}

export default function Solicitudes() {
  const enabled = !!useSession((s) => s.accessToken);
  const [filter, setFilter] = useState("en_revision");
  const leaves = useAdminLeaves(filter, enabled);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Solicitudes de ausencia</h1>
        <p className="mt-1 text-sm text-ink-2">
          Incapacidades, licencias y vacaciones de los quickers. Insumo de disponibilidad para la Torre de Control.
        </p>
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (leave.manage)." />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value || "todas"}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                  filter === f.value
                    ? "bg-brand-600 text-white"
                    : "border border-line bg-surface text-ink-2 hover:border-brand-300",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {leaves.isLoading ? (
            <LoadingState rows={3} />
          ) : leaves.isError ? (
            <ErrorState onRetry={() => leaves.refetch()} />
          ) : !leaves.data || leaves.data.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface">
              <EmptyState
                title="Sin solicitudes"
                hint={
                  filter === "en_revision"
                    ? "No hay solicitudes pendientes de revisión."
                    : "No hay solicitudes en este estado."
                }
              />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {leaves.data.map((r) => (
                <LeaveRow key={r.id} r={r} />
              ))}
            </ul>
          )}

          <p className="flex items-center gap-1.5 text-xs text-faint">
            <CalendarClock className="size-3.5" /> Las solicitudes aprobadas reducen la disponibilidad del quicker.
          </p>
        </>
      )}
    </div>
  );
}
