import { ArrowDownToLine, TrendingUp, ArrowUpRight, ArrowDownLeft, Minus } from "lucide-react";
import { toast } from "sonner";
import { useQuickerBalance } from "@/hooks/queries";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { cop } from "@/lib/format";
import { cn } from "@/lib/utils";

type MovementKind = "ingreso" | "retiro" | "descuento";

const KIND_ICON: Record<MovementKind, typeof ArrowUpRight> = {
  ingreso: ArrowUpRight,
  retiro: ArrowDownLeft,
  descuento: Minus,
};

const KIND_CLASS: Record<MovementKind, string> = {
  ingreso: "text-success",
  retiro: "text-danger",
  descuento: "text-warning",
};

const KIND_BG: Record<MovementKind, string> = {
  ingreso: "bg-success/10",
  retiro: "bg-danger/10",
  descuento: "bg-warning/10",
};

function KindIcon({ kind }: { kind: string }) {
  const Icon = KIND_ICON[kind as MovementKind] ?? Minus;
  const cls = KIND_CLASS[kind as MovementKind] ?? "text-muted";
  const bg = KIND_BG[kind as MovementKind] ?? "bg-muted/10";
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", bg)}>
      <Icon className={cn("h-4 w-4", cls)} aria-hidden="true" />
    </div>
  );
}

export default function Balance() {
  const { data, isLoading, isError, refetch } = useQuickerBalance();

  const handleWithdraw = () => {
    toast.info("Retiro solicitado", {
      description: "El dinero llegará a tu cuenta en 1–2 días hábiles.",
    });
  };

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Mi balance</h1>
        <p className="mt-0.5 text-sm text-muted">Ganancias y movimientos</p>
      </div>

      {/* Available + Retirar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 shadow-md">
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <p className="text-sm font-medium text-white/70">Disponible para retirar</p>
        <p className="mt-1 font-display text-4xl font-bold text-white">{cop(data.available)}</p>
        <Button
          className="mt-5 gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold"
          onClick={handleWithdraw}
          aria-label="Solicitar retiro de fondos"
        >
          <ArrowDownToLine className="h-4 w-4" />
          Retirar
        </Button>
      </div>

      {/* Today / Week cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            Hoy
          </div>
          <p className="mt-2 text-xl font-bold text-ink">{cop(data.today)}</p>
          <p className="mt-0.5 text-xs text-ink-2 font-medium">Ganado hoy</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Semana
          </div>
          <p className="mt-2 text-xl font-bold text-ink">{cop(data.week)}</p>
          <p className="mt-0.5 text-xs text-ink-2 font-medium">Esta semana</p>
        </div>
      </div>

      {/* Movement history */}
      <div>
        <h2 className="mb-3 font-semibold text-ink">Historial de movimientos</h2>

        {data.history.length === 0 ? (
          <EmptyState title="Sin movimientos aún" hint="Aquí verás tus ingresos y retiros." />
        ) : (
          <div className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
            {data.history.map((item, i) => {
              const isPositive = item.amount > 0;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <KindIcon kind={item.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.label}</p>
                    <p className="mt-0.5 text-xs capitalize text-ink-2">{item.kind}</p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      isPositive ? "text-success" : "text-danger",
                    )}
                    aria-label={`${isPositive ? "Ingreso" : "Descuento"}: ${cop(Math.abs(item.amount))}`}
                  >
                    {isPositive ? "+" : "−"}{cop(Math.abs(item.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
