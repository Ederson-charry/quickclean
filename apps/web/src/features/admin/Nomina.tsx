import { useMemo, useState } from "react";
import { Calculator, CheckCircle2, Clock, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  type PayrollBreakdown,
  type PayrollExtra,
  type PayrollRunDTO,
  useMarkPayrollPaid,
  usePayrollContracts,
  usePayrollHistory,
  usePayrollPreview,
  useRunPayroll,
} from "@/hooks/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cop, fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

type ExtraRow = PayrollExtra & { id: number };

function BreakdownPanel({ b }: { b: PayrollBreakdown }) {
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Liquidación · {b.days} días</p>
      <ul className="mt-3 space-y-1.5">
        {b.items.map((it, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className={cn(it.tipo === "deduccion" ? "text-danger" : "text-ink")}>
              {it.tipo === "deduccion" ? "− " : ""}
              {it.concepto}
            </span>
            <span className={cn("font-mono tabular-nums", it.tipo === "deduccion" ? "text-danger" : "text-ink")}>
              {it.tipo === "deduccion" ? "−" : ""}
              {cop(it.monto)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1 border-t border-brand-200 pt-3 text-sm">
        <div className="flex justify-between text-ink-2">
          <span>Devengado</span>
          <span className="font-mono tabular-nums">{cop(b.grossEarnings)}</span>
        </div>
        <div className="flex justify-between text-ink-2">
          <span>Deducciones</span>
          <span className="font-mono tabular-nums">−{cop(b.totalDeductions)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-ink">
          <span>Neto a pagar</span>
          <span className="font-mono tabular-nums text-brand-700">{cop(b.netPay)}</span>
        </div>
      </div>
    </div>
  );
}

function NominaForm() {
  const contracts = usePayrollContracts(true);
  const preview = usePayrollPreview();
  const run = useRunPayroll();

  const [contractId, setContractId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [extras, setExtras] = useState<ExtraRow[]>([]);
  const [breakdown, setBreakdown] = useState<PayrollBreakdown | null>(null);

  const selected = useMemo(
    () => contracts.data?.find((c) => c.id === contractId),
    [contracts.data, contractId],
  );

  const cleanExtras = (): PayrollExtra[] =>
    extras
      .filter((e) => e.concept.trim() && e.amount > 0)
      .map((e) => ({ concept: e.concept.trim(), kind: e.kind, amount: e.amount }));

  const canCompute = contractId && from && to;

  const onPreview = async () => {
    if (!canCompute) {
      toast.error("Selecciona contrato y período");
      return;
    }
    try {
      const b = await preview.mutateAsync({ contractId, periodFrom: from, periodTo: to, extras: cleanExtras() });
      setBreakdown(b);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo calcular");
    }
  };

  const onRun = async () => {
    try {
      await run.mutateAsync({ contractId, periodFrom: from, periodTo: to, extras: cleanExtras() });
      toast.success("Nómina liquidada");
      setBreakdown(null);
      setExtras([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo liquidar");
    }
  };

  const addExtra = (kind: "bono" | "deduccion") =>
    setExtras((rows) => [...rows, { id: Date.now() + rows.length, concept: "", kind, amount: 0 }]);

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
        <Calculator className="size-4 text-brand-600" /> Liquidar nómina
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="nom-contract">Empleado</Label>
          <Select
            value={contractId}
            onValueChange={(v) => {
              if (v) { setContractId(v); setBreakdown(null); }
            }}
          >
            <SelectTrigger id="nom-contract" className="w-full border-line">
              <SelectValue placeholder="Selecciona un contrato laboral">
                {(v) => {
                  const c = contracts.data?.find((x) => x.id === v);
                  return c ? `${c.quicker.name} · ${cop(c.monthlySalary ?? 0)}/mes` : "Selecciona un contrato laboral";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {contracts.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.quicker.name} · {c.position ?? "—"} · {cop(c.monthlySalary ?? 0)}/mes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected?.client && (
            <p className="text-xs text-faint">Empresa: {selected.client.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nom-from">Desde</Label>
          <Input id="nom-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setBreakdown(null); }} className="border-line" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nom-to">Hasta</Label>
          <Input id="nom-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setBreakdown(null); }} className="border-line" />
        </div>
      </div>

      {/* Extras: bonos y deducciones */}
      <div className="mt-4 space-y-2">
        {extras.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2">
            <Badge className={row.kind === "bono" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}>
              {row.kind === "bono" ? "Bono" : "Deducción"}
            </Badge>
            <Input
              placeholder="Concepto"
              value={row.concept}
              onChange={(e) =>
                setExtras((rows) => rows.map((r, j) => (j === i ? { ...r, concept: e.target.value } : r)))
              }
              className="flex-1 border-line"
            />
            <Input
              type="number"
              min={0}
              placeholder="Monto"
              value={row.amount || ""}
              onChange={(e) =>
                setExtras((rows) => rows.map((r, j) => (j === i ? { ...r, amount: Number(e.target.value) } : r)))
              }
              className="w-32 border-line"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setExtras((rows) => rows.filter((_, j) => j !== i))}
              aria-label="Quitar"
            >
              <Trash2 className="size-4 text-faint" />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => addExtra("bono")}>
            <Plus className="size-4" /> Bono
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => addExtra("deduccion")}>
            <Plus className="size-4" /> Deducción
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={!canCompute || preview.isPending} onClick={onPreview}>
          {preview.isPending ? "Calculando..." : "Calcular"}
        </Button>
        {breakdown && (
          <Button
            type="button"
            className="bg-brand-600 text-white hover:bg-brand-700"
            disabled={run.isPending}
            onClick={onRun}
          >
            {run.isPending ? "Liquidando..." : "Liquidar nómina"}
          </Button>
        )}
      </div>

      {breakdown && (
        <div className="mt-4">
          <BreakdownPanel b={breakdown} />
        </div>
      )}
    </div>
  );
}

function HistoryRow({ r }: { r: PayrollRunDTO }) {
  const markPaid = useMarkPayrollPaid();
  const paid = r.status === "pagada";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{r.contract.quicker.name}</p>
        <p className="text-xs text-faint">
          {fechaCorta(r.periodFrom)} – {fechaCorta(r.periodTo)}
          {r.contract.client ? ` · ${r.contract.client.name}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-mono text-sm font-semibold tabular-nums text-ink">{cop(r.netPay)}</p>
          <p className="text-[11px] text-faint">neto</p>
        </div>
        {paid ? (
          <Badge className="gap-1 bg-success/10 text-success">
            <CheckCircle2 className="size-3" /> Pagada
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={markPaid.isPending}
            onClick={() =>
              markPaid.mutate(r.id, {
                onSuccess: () => toast.success("Nómina marcada como pagada"),
                onError: () => toast.error("No se pudo actualizar"),
              })
            }
          >
            <Clock className="size-4" /> Marcar pagada
          </Button>
        )}
      </div>
    </li>
  );
}

export default function Nomina() {
  const enabled = !!useSession((s) => s.accessToken);
  const history = usePayrollHistory(enabled);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Nómina</h1>
        <p className="mt-1 text-sm text-ink-2">
          Liquidación de empleados (salario base, auxilio de transporte y aportes de ley). Insumo para el pago del ERP.
        </p>
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (compensation.manage)." />
        </div>
      ) : (
        <>
          <NominaForm />

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
              <Wallet className="size-4 text-brand-600" /> Historial de liquidaciones
            </h2>
            {history.isLoading ? (
              <LoadingState rows={3} />
            ) : history.isError ? (
              <ErrorState onRetry={() => history.refetch()} />
            ) : !history.data || history.data.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface">
                <EmptyState title="Sin nóminas" hint="Aún no se ha liquidado ninguna nómina." />
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
