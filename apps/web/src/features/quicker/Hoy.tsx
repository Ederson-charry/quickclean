import { Link } from "@tanstack/react-router";
import { Wallet, FileText, AlertCircle, Briefcase, Clock, Star } from "lucide-react";
import { toast } from "sonner";
import { useQuickerToday, useQuickerBalance } from "@/hooks/queries";
import { type QuickerBooking, useQuickerBookings, useQuickerTransition } from "@/hooks/catalog";
import { AssignmentCard } from "@/components/shared/AssignmentCard";
import { StatPill } from "@/components/shared/StatPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/States";
import { cop, fechaHora } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

const QUICK_LINKS = [
  { to: "/pro/balance", label: "Mi balance", icon: Wallet },
  { to: "/pro/solicitudes", label: "Incapacidad", icon: AlertCircle },
  { to: "/pro/solicitudes", label: "Licencia", icon: FileText },
];

// Tarjeta de un servicio real asignado al quicker, con acciones iniciar/completar.
function QuickerServiceCard({ b }: { b: QuickerBooking }) {
  const transition = useQuickerTransition();
  const act = (status: string, label: string) =>
    transition.mutate(
      { id: b.id, status },
      { onSuccess: () => toast.success(label), onError: () => toast.error("No se pudo actualizar") },
    );

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-ink">{b.category?.name ?? "Servicio"}</span>
        <Badge className={b.status === "en_curso" ? "bg-warning/10 text-warning" : "bg-brand-100 text-brand-700"}>
          {b.status === "en_curso" ? "En curso" : "Agendado"}
        </Badge>
      </div>
      <p className="mt-1 font-mono text-xs tabular-nums text-faint">{fechaHora(b.scheduledAt)} · {b.duration}h</p>
      <p className="mt-0.5 truncate text-xs text-ink-2">{b.client?.email} · {b.address}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{cop(b.payout)}</span>
        {b.status === "agendado" ? (
          <Button size="sm" className="bg-brand-600 text-white hover:bg-brand-700" onClick={() => act("en_curso", "Servicio iniciado")}>
            Iniciar
          </Button>
        ) : (
          <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => act("completado", "Servicio completado")}>
            Completar
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Hoy() {
  const useReal = !!useSession((s) => s.accessToken);
  const realQ = useQuickerBookings(useReal);
  const today = useQuickerToday();
  const balanceQ = useQuickerBalance();

  const realServices = realQ.data;
  const count = useReal ? realServices?.length : today.data?.length;
  const hours = useReal
    ? realServices?.reduce((s, b) => s + b.duration, 0)
    : today.data?.reduce((s, a) => s + a.durationHours, 0);

  const listLoading = useReal ? realQ.isLoading : today.isLoading;
  const listError = useReal ? realQ.isError : today.isError;
  const listRefetch = useReal ? realQ.refetch : today.refetch;
  const isEmpty = useReal ? realServices?.length === 0 : today.data?.length === 0;

  return (
    <div className="space-y-6">
      {/* Balance header — gradient card (demo) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-md">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -right-2 h-24 w-24 rounded-full bg-white/5" />

        <p className="text-sm font-medium text-white/70">Balance del día</p>
        {balanceQ.isLoading ? (
          <div className="mt-1 h-10 w-40 animate-pulse rounded-lg bg-white/20" />
        ) : balanceQ.data ? (
          <p className="mt-1 font-display text-4xl font-bold tracking-tight">{cop(balanceQ.data.today)}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <StatPill icon={Briefcase} value={count ?? 0} label="Servicios" />
          <StatPill icon={Clock} value={`${hours ?? 0}h`} label="Horas" />
          <StatPill icon={Star} value={balanceQ.data?.week ? "4.9" : "—"} label="Rating" />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-4 text-center transition-all hover:border-brand-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            aria-label={link.label}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
              <link.icon className="h-5 w-5 text-brand-600" />
            </div>
            <span className="text-xs font-medium leading-tight text-ink-2">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Servicios asignados */}
      <div>
        <h2 className="mb-3 font-semibold text-ink">Servicios de hoy</h2>

        {listLoading && <LoadingState rows={3} />}
        {listError && <ErrorState onRetry={() => listRefetch()} />}
        {!listLoading && !listError && isEmpty && (
          <EmptyState title="Sin servicios asignados" hint="No tienes servicios programados por ahora." />
        )}

        {useReal && realServices && realServices.length > 0 && (
          <div className="space-y-3">
            {realServices.map((b) => (
              <QuickerServiceCard key={b.id} b={b} />
            ))}
          </div>
        )}

        {!useReal && today.data && today.data.length > 0 && (
          <div className="space-y-3">
            {today.data.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )}
      </div>

      {/* Balance teaser (demo) */}
      {balanceQ.data && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-2">Disponible para retirar</p>
              <p className="mt-0.5 text-xl font-bold text-ink">{cop(balanceQ.data.available)}</p>
            </div>
            <Link
              to="/pro/balance"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-brand-300 text-brand-600 hover:bg-brand-50",
              )}
            >
              Ver balance
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
