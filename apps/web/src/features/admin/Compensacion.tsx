import { Banknote, CheckCircle2, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import {
  type PayoutRecord,
  type PendingCompensation,
  useCompensationHistory,
  useLiquidate,
  useMarkPaid,
  usePendingCompensation,
} from "@/hooks/catalog";
import { cop, fechaCorta } from "@/lib/format";
import { useSession } from "@/stores/session";

function PendingCard({ p }: { p: PendingCompensation }) {
  const liquidate = useLiquidate();
  return (
    <li className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-ink">{p.name}</span>
        <span className="inline-flex items-center gap-1 text-xs text-faint">
          <MapPin className="size-3" /> {p.zone}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{cop(p.amount)}</p>
      <p className="text-xs text-ink-2">
        {p.bookingCount} servicio{p.bookingCount === 1 ? "" : "s"} completado{p.bookingCount === 1 ? "" : "s"}
      </p>
      <Button
        size="sm"
        className="mt-3 w-full bg-brand-600 text-white hover:bg-brand-700"
        disabled={liquidate.isPending}
        onClick={() =>
          liquidate.mutate(p.quickerId, {
            onSuccess: () => toast.success(`Cuenta de cobro generada para ${p.name}`),
            onError: () => toast.error("No se pudo liquidar"),
          })
        }
      >
        Liquidar
      </Button>
    </li>
  );
}

function HistoryRow({ r }: { r: PayoutRecord }) {
  const markPaid = useMarkPaid();
  const paid = r.status === "pagado";
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{r.quicker?.name ?? "—"}</p>
        <p className="text-xs text-faint">
          {fechaCorta(r.createdAt)} · {r.bookingCount} serv.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold tabular-nums text-ink">{cop(r.amount)}</span>
        {paid ? (
          <Badge className="gap-1 bg-success/10 text-success">
            <CheckCircle2 className="size-3" /> Pagado
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={markPaid.isPending}
            onClick={() =>
              markPaid.mutate(r.id, {
                onSuccess: () => toast.success("Marcado como pagado"),
                onError: () => toast.error("No se pudo actualizar"),
              })
            }
          >
            <Clock className="size-4" /> Marcar pagado
          </Button>
        )}
      </div>
    </li>
  );
}

export default function Compensacion() {
  const enabled = !!useSession((s) => s.accessToken);
  const pending = usePendingCompensation(enabled);
  const history = useCompensationHistory(enabled);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Compensación</h1>
        <p className="mt-1 text-sm text-ink-2">
          Liquidación de cuentas de cobro a quickers (insumo para nómina del ERP).
        </p>
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (compensation.manage)." />
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
              <Banknote className="size-4 text-brand-600" /> Pendiente por liquidar
            </h2>
            {pending.isLoading ? (
              <LoadingState rows={3} />
            ) : pending.isError ? (
              <ErrorState onRetry={() => pending.refetch()} />
            ) : !pending.data || pending.data.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface">
                <EmptyState title="Nada pendiente" hint="No hay servicios completados sin liquidar." />
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pending.data.map((p) => (
                  <PendingCard key={p.quickerId} p={p} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">Historial de liquidaciones</h2>
            {history.isLoading ? (
              <LoadingState rows={3} />
            ) : history.isError ? (
              <ErrorState onRetry={() => history.refetch()} />
            ) : !history.data || history.data.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface">
                <EmptyState title="Sin liquidaciones" hint="Aún no se ha generado ninguna cuenta de cobro." />
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.data.map((r) => (
                  <HistoryRow key={r.id} r={r} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
