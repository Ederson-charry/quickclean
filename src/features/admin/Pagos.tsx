import { useState } from "react";
import { usePayouts, usePayPayout, usePayAll, useQuickers } from "@/hooks/queries";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cop } from "@/lib/format";
import { Loader2, Banknote, Clock, Percent } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import type { Payout } from "@/mocks/types";

const PERIOD_OPTIONS = ["1–15 Jun 2026", "16–31 May 2026"] as const;

export default function Pagos() {
  const { data: payouts, isLoading, isError, refetch } = usePayouts();
  const { data: quickers } = useQuickers();
  const { mutateAsync: payPayout } = usePayPayout();
  const { mutateAsync: payAll, isPending: payingAll } = usePayAll();

  const [period, setPeriod] = useState<string>(PERIOD_OPTIONS[0]);
  const [confirmPayout, setConfirmPayout] = useState<Payout | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const filtered = payouts?.filter((p) => p.period === period) ?? [];
  const pending = filtered.filter((p) => p.status === "pendiente");
  const totalNet = pending.reduce((sum, p) => sum + p.net, 0);
  const totalDeductions = pending.reduce((sum, p) => sum + p.deductions, 0);

  const getQuickerName = (quickerId: string) => {
    return quickers?.find((q) => q.id === quickerId)?.name ?? quickerId;
  };

  const handlePayOne = async (payout: Payout) => {
    setPayingId(payout.id);
    setConfirmPayout(null);
    try {
      await payPayout(payout.id);
      toast.success(`Pago a ${getQuickerName(payout.quickerId)} procesado`);
    } catch {
      toast.error("Error al procesar el pago");
    } finally {
      setPayingId(null);
    }
  };

  const handlePayAll = async () => {
    setConfirmAll(false);
    try {
      await payAll();
      toast.success("Todos los pagos procesados correctamente");
    } catch {
      toast.error("Error al procesar los pagos");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-display)] text-ink">
            Pagar Quickers
          </h1>
          <p className="mt-0.5 text-sm text-muted">Liquidación de nómina por periodo</p>
        </div>
        <Button
          onClick={() => setConfirmAll(true)}
          disabled={payingAll || pending.length === 0}
          className="bg-success hover:bg-success/90 text-white shrink-0"
        >
          {payingAll ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Procesando…</>
          ) : (
            <><Banknote className="h-4 w-4" />Pagar a todos</>
          )}
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2" role="group" aria-label="Seleccionar periodo">
        <span className="text-sm font-medium text-ink-2 shrink-0">Periodo:</span>
        <div className="flex gap-1 flex-wrap">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`rounded-full px-3 py-1.5 min-h-[36px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                period === p
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-surface border border-line text-ink-2 hover:border-brand-300 hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Banknote}
          value={cop(totalNet)}
          label="Total a pagar (pendientes)"
        />
        <StatCard
          icon={Clock}
          value={pending.length.toString()}
          label="Pagos pendientes"
        />
        <StatCard
          icon={Percent}
          value={cop(totalDeductions)}
          label="Comisiones plataforma"
          iconColor="text-warning"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[700px] text-sm" role="table">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Quicker</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Servicios</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Horas</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Bruto</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Deducciones</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Neto</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Estado</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-muted">
                    No hay liquidaciones para este periodo.
                  </td>
                </tr>
              ) : (
                filtered.map((payout) => {
                  const name = getQuickerName(payout.quickerId);
                  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
                  const isPaying = payingId === payout.id;

                  return (
                    <tr key={payout.id} className="border-b border-line last:border-0 hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2.5 min-w-[140px]">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-ink text-sm truncate">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-ink tabular-nums">{payout.services}</td>
                      <td className="px-4 py-3 align-middle text-ink tabular-nums">{payout.hours}h</td>
                      <td className="px-4 py-3 align-middle text-ink tabular-nums">{cop(payout.gross)}</td>
                      <td className="px-4 py-3 align-middle text-muted tabular-nums">−{cop(payout.deductions)}</td>
                      <td className="px-4 py-3 align-middle font-semibold text-ink tabular-nums">{cop(payout.net)}</td>
                      <td className="px-4 py-3 align-middle">
                        {payout.status === "pagado" ? (
                          <Badge className="bg-success/10 text-success border-0">Pagado</Badge>
                        ) : (
                          <Badge className="bg-warning/15 text-warning border-0">Pendiente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {payout.status === "pendiente" ? (
                          <Button
                            size="sm"
                            onClick={() => setConfirmPayout(payout)}
                            disabled={isPaying}
                            className="bg-brand-600 hover:bg-brand-700 text-white"
                          >
                            {isPaying ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Pagar"
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm one payout dialog */}
      <Dialog open={!!confirmPayout} onOpenChange={(open) => !open && setConfirmPayout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago</DialogTitle>
            <DialogDescription>
              {confirmPayout && (
                <>
                  ¿Confirmas el pago de{" "}
                  <strong>{cop(confirmPayout.net)}</strong> a{" "}
                  <strong>{getQuickerName(confirmPayout.quickerId)}</strong> por el periodo{" "}
                  {confirmPayout.period}?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPayout(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => confirmPayout && handlePayOne(confirmPayout)}
            >
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm pay all dialog */}
      <Dialog open={confirmAll} onOpenChange={setConfirmAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar a todos</DialogTitle>
            <DialogDescription>
              Se procesarán <strong>{pending.length} pagos</strong> por un total de{" "}
              <strong>{cop(totalNet)}</strong>. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAll(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-success hover:bg-success/90 text-white"
              onClick={handlePayAll}
            >
              Procesar todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
