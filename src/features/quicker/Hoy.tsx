import { Link } from "@tanstack/react-router";
import { Wallet, FileText, AlertCircle, Briefcase, Clock, Star } from "lucide-react";
import { useQuickerToday, useQuickerBalance } from "@/hooks/queries";
import { AssignmentCard } from "@/components/shared/AssignmentCard";
import { StatPill } from "@/components/shared/StatPill";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/States";
import { cop } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { to: "/pro/balance", label: "Mi balance", icon: Wallet },
  { to: "/pro/solicitudes", label: "Incapacidad", icon: AlertCircle },
  { to: "/pro/solicitudes", label: "Licencia", icon: FileText },
];

export default function Hoy() {
  const today = useQuickerToday();
  const balanceQ = useQuickerBalance();

  return (
    <div className="space-y-6">
      {/* Balance header — gradient card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-md">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -right-2 h-24 w-24 rounded-full bg-white/5" />

        <p className="text-sm font-medium text-white/70">Balance del día</p>
        {balanceQ.isLoading ? (
          <div className="mt-1 h-10 w-40 animate-pulse rounded-lg bg-white/20" />
        ) : balanceQ.isError ? (
          <p className="mt-1 text-sm text-white/70">No disponible · <button type="button" onClick={() => balanceQ.refetch()} aria-label="Reintentar cargar balance" className="underline hover:no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded">Reintentar</button></p>
        ) : balanceQ.data ? (
          <p className="mt-1 font-display text-4xl font-bold tracking-tight">
            {cop(balanceQ.data.today)}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {balanceQ.isLoading ? (
            <>
              <div className="h-10 w-28 animate-pulse rounded-full bg-white/20" />
              <div className="h-10 w-28 animate-pulse rounded-full bg-white/20" />
              <div className="h-10 w-28 animate-pulse rounded-full bg-white/20" />
            </>
          ) : today.data ? (
            <>
              <StatPill
                icon={Briefcase}
                value={today.data.length}
                label="Servicios"
              />
              <StatPill
                icon={Clock}
                value={`${today.data.reduce((s, a) => s + a.durationHours, 0)}h`}
                label="Horas"
              />
              <StatPill
                icon={Star}
                value={balanceQ.data?.week ? "4.9" : "—"}
                label="Rating"
              />
            </>
          ) : null}
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
            <span className="text-xs font-medium text-ink-2 leading-tight">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Today's assignments */}
      <div>
        <h2 className="mb-3 font-semibold text-ink">Servicios de hoy</h2>

        {today.isLoading && <LoadingState rows={3} />}

        {today.isError && (
          <ErrorState onRetry={() => today.refetch()} />
        )}

        {today.data && today.data.length === 0 && (
          <EmptyState
            title="Sin servicios asignados"
            hint="No tienes servicios programados para hoy."
          />
        )}

        {today.data && today.data.length > 0 && (
          <div className="space-y-3">
            {today.data.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )}
      </div>

      {/* Balance teaser */}
      {balanceQ.data && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-2">Disponible para retirar</p>
              <p className="mt-0.5 text-xl font-bold text-ink">
                {cop(balanceQ.data.available)}
              </p>
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
