import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  CalendarClock,
  Eye,
  EyeOff,
  Info,
  Plus,
  ReceiptText,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import {
  type AppliesOn,
  type ComponentDraft,
  type CondParam,
  type Nature,
  type PayoutType,
  type PriceBreakdown,
  type Tariff,
  type TariffComponentDTO,
  type ValueType,
  useDeactivateTariff,
  usePublishTariff,
  useServiceCategories,
  useSimulateTariff,
  useTariffs,
  usePricePreview,
} from "@/hooks/catalog";
import { cop, fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

const STATUS = {
  active: { cls: "bg-success/10 text-success", label: "Vigente" },
  scheduled: { cls: "bg-amber-500/10 text-amber-600", label: "Programada" },
  expired: { cls: "bg-bg text-faint", label: "Expirada" },
  draft: { cls: "bg-bg text-ink-2", label: "Borrador" },
} as const;

function StatusBadge({ status }: { status: Tariff["status"] }) {
  const s = STATUS[status];
  return <Badge className={cn("font-medium", s.cls)}>{s.label}</Badge>;
}

const DURATIONS = ["4", "6", "8"];
const FREQUENCIES = [
  { v: "unica", l: "Única" },
  { v: "semanal", l: "Semanal" },
  { v: "quincenal", l: "Quincenal" },
  { v: "mensual", l: "Mensual" },
];
const SIZES = [
  { v: "S", l: "Pequeño" },
  { v: "M", l: "Mediano" },
  { v: "L", l: "Grande" },
];

const pct = (n: number): string => `${Math.round(n * 100)}%`;

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Tag; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Icon className="size-4 text-brand-600" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Una línea del desglose (aporte firmado, con signo y color según naturaleza). */
function LineRow({
  label,
  formula,
  amount,
  nature,
  muted,
}: {
  label: string;
  formula?: string;
  amount: number;
  nature: Nature;
  muted?: boolean;
}) {
  const sign = amount < 0 ? "−" : nature === "base" ? "" : "+";
  const color = nature === "discount" ? "text-success" : nature === "base" ? "text-ink" : "text-ink-2";
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className={cn("min-w-0", muted ? "text-faint" : "text-ink-2")}>
        {label}
        {formula && <span className="block text-[11px] text-faint">{formula}</span>}
      </span>
      <span className={cn("shrink-0 font-mono tabular-nums", color)}>
        {sign} {cop(Math.abs(amount))}
      </span>
    </div>
  );
}

/** Desglose calculado (líneas dinámicas + total + pago al quicker). */
function Breakdown({ b }: { b: PriceBreakdown }) {
  return (
    <div className="space-y-0.5">
      {b.lines.map((l) => (
        <LineRow key={l.code} label={l.label} formula={l.formula} amount={l.amount} nature={l.nature} muted={!l.visibleToClient} />
      ))}
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm font-semibold">
        <span className="text-ink">Total al cliente</span>
        <span className="font-mono tabular-nums text-brand-700">{cop(b.total)}</span>
      </div>
      <div className="mt-1 rounded-md bg-success/5 p-2">
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-ink">Pago al quicker</span>
          <span className="font-mono tabular-nums text-success">{cop(b.payout)}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-ink-2">
          {b.payoutType === "fixed"
            ? "Valor fijo por servicio"
            : `${pct(b.payoutValue)} sobre ${cop(b.payoutBase)} (componentes marcados)`}
        </p>
      </div>
    </div>
  );
}

// ─── Previsualizador ──────────────────────────────────────────────────────────
function Previewer({ categoryId }: { categoryId: string | undefined }) {
  const [duration, setDuration] = useState("4");
  const [frequency, setFrequency] = useState("unica");
  const [size, setSize] = useState("M");
  const [supplies, setSupplies] = useState(false);

  const input = useMemo(
    () =>
      categoryId
        ? { serviceCategoryId: categoryId, duration: Number(duration), frequency, size, supplies }
        : null,
    [categoryId, duration, frequency, size, supplies],
  );
  const { data, isFetching, isError } = usePricePreview(input);

  return (
    <Card title="Previsualizador de precio" icon={Calculator}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-ink-2">Duración (h)</Label>
          <Select value={duration} onValueChange={(v) => setDuration(v ?? "4")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d} horas
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-ink-2">Frecuencia</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v ?? "unica")}>
            <SelectTrigger>
              <SelectValue>{(v) => FREQUENCIES.find((f) => f.v === v)?.l ?? String(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f.v} value={f.v}>
                  {f.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-ink-2">Tamaño</Label>
          <Select value={size} onValueChange={(v) => setSize(v ?? "M")}>
            <SelectTrigger>
              <SelectValue>{(v) => SIZES.find((s) => s.v === v)?.l ?? String(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s.v} value={s.v}>
                  {s.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end justify-between gap-2 pb-1">
          <Label htmlFor="supplies" className="text-xs text-ink-2">
            Incluye insumos
          </Label>
          <Switch id="supplies" checked={supplies} onCheckedChange={setSupplies} />
        </div>
      </div>

      <div className={cn("mt-4 transition-opacity", isFetching && "opacity-60")}>
        {isError ? (
          <p className="py-4 text-center text-sm text-faint">Esta categoría no tiene tarifa vigente.</p>
        ) : data ? (
          <Breakdown b={data} />
        ) : (
          <p className="py-4 text-center text-sm text-faint">Selecciona una categoría.</p>
        )}
      </div>
    </Card>
  );
}

// ─── Editor de componentes ────────────────────────────────────────────────────
const NATURE_OPTS: { v: Nature; l: string }[] = [
  { v: "base", l: "Tarifa base" },
  { v: "cost", l: "Costo adicional" },
  { v: "discount", l: "Descuento" },
];
const natureLabel = (v: string) => NATURE_OPTS.find((o) => o.v === v)?.l ?? v;

const VALUETYPE_BASE: { v: ValueType; l: string }[] = [
  { v: "table", l: "Tabla por duración" },
  { v: "fixed", l: "Valor fijo ($)" },
];
const VALUETYPE_MOD: { v: ValueType; l: string }[] = [
  { v: "fixed", l: "Valor fijo ($)" },
  { v: "percent", l: "Porcentaje (%)" },
];
const valueTypeLabel = (v: string) =>
  [...VALUETYPE_BASE, ...VALUETYPE_MOD].find((o) => o.v === v)?.l ?? v;

const APPLIESON_OPTS: { v: AppliesOn; l: string }[] = [
  { v: "base", l: "el valor base" },
  { v: "subtotal", l: "el subtotal acumulado" },
  { v: "selection", l: "una selección de componentes" },
];
const appliesOnLabel = (v: string) => APPLIESON_OPTS.find((o) => o.v === v)?.l ?? v;

const COND_OPTS: { v: "" | CondParam; l: string }[] = [
  { v: "", l: "Siempre" },
  { v: "size", l: "Según tamaño" },
  { v: "frequency", l: "Según frecuencia" },
  { v: "duration", l: "Según duración" },
  { v: "supplies", l: "Solo con insumos" },
  { v: "holiday", l: "Solo en día festivo" },
];
const condLabel = (v: string) => COND_OPTS.find((o) => o.v === v)?.l ?? v;

interface EditComp {
  code: string;
  label: string;
  nature: Nature;
  valueType: ValueType;
  value: string; // fijo: pesos; porcentaje: número (15 = 15%)
  durationTable: Record<string, string>;
  appliesOn: AppliesOn;
  appliesOnRefs: { code: string; op: "add" | "sub" }[];
  condParam: "" | CondParam;
  condValue: string;
  countsForPayout: boolean;
  visibleToClient: boolean;
}

const emptyDurationTable = (): Record<string, string> => Object.fromEntries(DURATIONS.map((d) => [d, ""]));

function fromDTO(c: TariffComponentDTO): EditComp {
  return {
    code: c.code,
    label: c.label,
    nature: c.nature,
    valueType: c.valueType,
    value: c.valueType === "percent" ? String(Math.round(c.value * 10000) / 100) : c.valueType === "fixed" ? String(c.value) : "0",
    durationTable: { ...emptyDurationTable(), ...Object.fromEntries(Object.entries(c.durationTable ?? {}).map(([k, v]) => [k, String(v)])) },
    appliesOn: c.appliesOn,
    appliesOnRefs: c.appliesOnRefs ?? [],
    condParam: c.condParam ?? "",
    condValue: c.condValue ?? "",
    countsForPayout: c.countsForPayout,
    visibleToClient: c.visibleToClient,
  };
}

function defaultComps(active: Tariff | null | undefined): EditComp[] {
  if (active && active.components.length) {
    return [...active.components].sort((a, b) => a.order - b.order).map(fromDTO);
  }
  return [
    {
      code: "base",
      label: "Tarifa base",
      nature: "base",
      valueType: "table",
      value: "0",
      durationTable: { "4": "79900", "6": "109900", "8": "139900" },
      appliesOn: "base",
      appliesOnRefs: [],
      condParam: "",
      condValue: "",
      countsForPayout: true,
      visibleToClient: true,
    },
    {
      code: "comision",
      label: "Comisión de plataforma",
      nature: "cost",
      valueType: "fixed",
      value: "6900",
      durationTable: emptyDurationTable(),
      appliesOn: "base",
      appliesOnRefs: [],
      condParam: "",
      condValue: "",
      countsForPayout: false,
      visibleToClient: true,
    },
  ];
}

/** EditComp (con value en % legible) → ComponentDraft para el backend. */
function toDraft(c: EditComp, index: number): ComponentDraft {
  const num = Number(c.value) || 0;
  const isCond = c.condParam !== "";
  return {
    order: index,
    code: c.code,
    label: c.label.trim() || c.code,
    nature: c.nature,
    valueType: c.valueType,
    value: c.valueType === "percent" ? num / 100 : c.valueType === "fixed" ? num : 0,
    durationTable:
      c.valueType === "table"
        ? Object.fromEntries(Object.entries(c.durationTable).map(([k, v]) => [k, Number(v) || 0]))
        : null,
    appliesOn: c.valueType === "percent" ? c.appliesOn : "base",
    appliesOnRefs: c.valueType === "percent" && c.appliesOn === "selection" ? c.appliesOnRefs : null,
    condParam: isCond ? (c.condParam as CondParam) : null,
    condValue: !isCond ? null : c.condParam === "supplies" || c.condParam === "holiday" ? "true" : c.condValue,
    countsForPayout: c.countsForPayout,
    visibleToClient: c.visibleToClient,
  };
}

function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const publishSchema = z.object({
  name: z.string().min(2),
  effectiveFrom: z.string().min(1),
});

/** Tarjeta editable de un componente. */
function ComponentCard({
  c,
  index,
  total,
  earlier,
  onChange,
  onMove,
  onRemove,
}: {
  c: EditComp;
  index: number;
  total: number;
  earlier: EditComp[];
  onChange: (patch: Partial<EditComp>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const valueTypeOpts = c.nature === "base" ? VALUETYPE_BASE : VALUETYPE_MOD;

  return (
    <div className="rounded-lg border border-line bg-bg/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
          {index + 1}
        </span>
        <Input
          value={c.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Nombre del componente"
          className="h-8 flex-1 font-medium"
        />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Subir" onClick={() => onMove(-1)} disabled={index === 0}>
          <ArrowUp className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Bajar" onClick={() => onMove(1)} disabled={index === total - 1}>
          <ArrowDown className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar componente" onClick={onRemove} disabled={total <= 1}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-ink-2">Tipo</Label>
          <Select
            value={c.nature}
            onValueChange={(v) => {
              const nature = (v ?? "cost") as Nature;
              // Al cambiar de/hacia base, ajusta el tipo de valor a uno válido.
              const valueType: ValueType = nature === "base" ? "table" : c.valueType === "table" ? "fixed" : c.valueType;
              onChange({ nature, valueType });
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue>{(v) => natureLabel(v as string)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {NATURE_OPTS.map((o) => (
                <SelectItem key={o.v} value={o.v}>
                  {o.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-ink-2">Cómo se calcula</Label>
          <Select value={c.valueType} onValueChange={(v) => onChange({ valueType: (v ?? "fixed") as ValueType })}>
            <SelectTrigger className="h-8">
              <SelectValue>{(v) => valueTypeLabel(v as string)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {valueTypeOpts.map((o) => (
                <SelectItem key={o.v} value={o.v}>
                  {o.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Valor según el tipo de cálculo */}
      {c.valueType === "table" ? (
        <div className="mt-2 space-y-1">
          <Label className="text-[11px] text-ink-2">Precio por duración ($)</Label>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <div key={d} className="space-y-0.5">
                <span className="text-[10px] text-faint">{d} horas</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={c.durationTable[d] ?? ""}
                  onChange={(e) => onChange({ durationTable: { ...c.durationTable, [d]: e.target.value } })}
                  className="h-8"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-ink-2">{c.valueType === "percent" ? "Porcentaje (%)" : "Valor ($)"}</Label>
            <Input
              type="number"
              step="any"
              inputMode="decimal"
              value={c.value}
              onChange={(e) => onChange({ value: e.target.value })}
              className="h-8"
            />
          </div>
          {c.valueType === "percent" && (
            <div className="space-y-1">
              <Label className="text-[11px] text-ink-2">Se calcula sobre</Label>
              <Select value={c.appliesOn} onValueChange={(v) => onChange({ appliesOn: (v ?? "base") as AppliesOn })}>
                <SelectTrigger className="h-8">
                  <SelectValue>{(v) => appliesOnLabel(v as string)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {APPLIESON_OPTS.map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Selección firmada de componentes previos (solo % sobre selección) */}
      {c.valueType === "percent" && c.appliesOn === "selection" && (
        <div className="mt-2 rounded-md border border-dashed border-line p-2">
          <p className="mb-1 text-[11px] font-medium text-ink-2">Sumar o restar componentes anteriores:</p>
          {earlier.length === 0 ? (
            <p className="text-[11px] text-faint">No hay componentes antes de este.</p>
          ) : (
            <div className="space-y-1">
              {earlier.map((e) => {
                const ref = c.appliesOnRefs.find((r) => r.code === e.code);
                const cur = ref?.op ?? "";
                return (
                  <div key={e.code} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[12px] text-ink-2">{e.label || e.code}</span>
                    <Select
                      value={cur}
                      onValueChange={(v) => {
                        const op = v ?? "";
                        const rest = c.appliesOnRefs.filter((r) => r.code !== e.code);
                        onChange({ appliesOnRefs: op === "" ? rest : [...rest, { code: e.code, op: op as "add" | "sub" }] });
                      }}
                    >
                      <SelectTrigger className="h-7 w-28">
                        <SelectValue>{(v) => (v === "add" ? "Sumar" : v === "sub" ? "Restar" : "—")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— (ignorar)</SelectItem>
                        <SelectItem value="add">Sumar</SelectItem>
                        <SelectItem value="sub">Restar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Condición de aplicación */}
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-ink-2">Se aplica</Label>
          <Select
            value={c.condParam}
            onValueChange={(v) => onChange({ condParam: (v ?? "") as "" | CondParam, condValue: "" })}
          >
            <SelectTrigger className="h-8">
              <SelectValue>{(v) => condLabel(v as string)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COND_OPTS.map((o) => (
                <SelectItem key={o.v} value={o.v}>
                  {o.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(c.condParam === "size" || c.condParam === "frequency" || c.condParam === "duration") && (
          <div className="space-y-1">
            <Label className="text-[11px] text-ink-2">Valor</Label>
            <Select value={c.condValue} onValueChange={(v) => onChange({ condValue: v ?? "" })}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Elige…" />
              </SelectTrigger>
              <SelectContent>
                {(c.condParam === "size" ? SIZES : c.condParam === "frequency" ? FREQUENCIES : DURATIONS.map((d) => ({ v: d, l: `${d} horas` }))).map(
                  (o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.l}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Flags */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-2">
        <label className="flex items-center gap-2 text-[12px] text-ink-2">
          <Switch checked={c.countsForPayout} onCheckedChange={(v) => onChange({ countsForPayout: v })} aria-label="Cuenta para el pago" />
          <Wallet className="size-3.5 text-faint" /> Cuenta para el pago al quicker
        </label>
        <label className="flex items-center gap-2 text-[12px] text-ink-2">
          <Switch checked={c.visibleToClient} onCheckedChange={(v) => onChange({ visibleToClient: v })} aria-label="Visible al cliente" />
          {c.visibleToClient ? <Eye className="size-3.5 text-faint" /> : <EyeOff className="size-3.5 text-faint" />} Visible al cliente
        </label>
      </div>
    </div>
  );
}

// ─── Diálogo: publicar nueva versión ──────────────────────────────────────────
function PublishDialog({
  categoryId,
  active,
  open,
  onClose,
}: {
  categoryId: string;
  active: Tariff | null | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const publish = usePublishTariff();
  const simulate = useSimulateTariff();
  const seq = useRef(0);
  const [name, setName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(localNow());
  const [comps, setComps] = useState<EditComp[]>(defaultComps(active));
  const [payoutType, setPayoutType] = useState<PayoutType>("percent");
  const [payoutValue, setPayoutValue] = useState("70");
  const [otp, setOtp] = useState("");
  const [sim, setSim] = useState({ duration: "4", frequency: "unica", size: "M", supplies: false, holiday: false });
  const [simResult, setSimResult] = useState<PriceBreakdown | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setEffectiveFrom(localNow());
      setComps(defaultComps(active));
      setPayoutType(active?.payoutType ?? "percent");
      setPayoutValue(
        active ? (active.payoutType === "percent" ? String(Math.round(active.payoutValue * 10000) / 100) : String(active.payoutValue)) : "70",
      );
      setOtp("");
      setSimResult(null);
    }
  }, [open, active]);

  const setComp = (i: number, patch: Partial<EditComp>) =>
    setComps((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const moveComp = (i: number, dir: -1 | 1) =>
    setComps((cs) => {
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addComp = () => {
    seq.current += 1;
    setComps((cs) => [
      ...cs,
      {
        code: `comp_${seq.current}`,
        label: "Nuevo componente",
        nature: "cost",
        valueType: "fixed",
        value: "0",
        durationTable: emptyDurationTable(),
        appliesOn: "base",
        appliesOnRefs: [],
        condParam: "",
        condValue: "",
        countsForPayout: true,
        visibleToClient: true,
      },
    ]);
  };

  const payoutConfig = () => ({
    payoutType,
    payoutValue: payoutType === "percent" ? (Number(payoutValue) || 0) / 100 : Number(payoutValue) || 0,
  });

  const runSimulation = () => {
    setSimResult(null);
    simulate.mutate(
      {
        ...payoutConfig(),
        components: comps.map(toDraft),
        duration: Number(sim.duration) || 0,
        frequency: sim.frequency,
        size: sim.size,
        supplies: sim.supplies,
        holiday: sim.holiday,
      },
      { onSuccess: (b) => setSimResult(b), onError: () => toast.error("No se pudo simular") },
    );
  };

  const submit = () => {
    const parsed = publishSchema.safeParse({ name, effectiveFrom });
    if (!parsed.success) {
      toast.error("Revisa el nombre y la vigencia.");
      return;
    }
    if (!comps.some((c) => c.nature === "base")) {
      toast.error("Agrega al menos un componente de tarifa base.");
      return;
    }
    publish.mutate(
      {
        serviceCategoryId: categoryId,
        name: parsed.data.name,
        effectiveFrom: new Date(parsed.data.effectiveFrom).toISOString(),
        ...payoutConfig(),
        components: comps.map(toDraft),
        otp: otp || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Nueva versión de tarifa publicada");
          onClose();
        },
        onError: () => toast.error("No se pudo publicar (permiso o 2FA requerido)"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Nueva versión de tarifa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-name" className="text-xs text-ink-2">
                Nombre
              </Label>
              <Input id="t-name" placeholder="Tarifa 2026-Q4" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-from" className="text-xs text-ink-2">
                Vigente desde
              </Label>
              <Input id="t-from" type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
          </div>

          {/* Componentes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-ink-2">Componentes del precio</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      className="text-faint transition-colors hover:text-brand-600 focus-visible:text-brand-600 focus-visible:outline-none"
                      aria-label="Cómo funcionan los componentes"
                    >
                      <Info className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="mb-1 font-semibold">Cómo se arma el precio</p>
                      <p className="mb-1">
                        Los componentes se calculan <b>en orden, de arriba hacia abajo</b>. Empieza con una{" "}
                        <b>tarifa base</b>; luego suma <b>costos</b> o resta <b>descuentos</b>.
                      </p>
                      <p className="text-white/80">
                        Un porcentaje se calcula sobre el valor base, sobre el subtotal acumulado, o sobre una selección
                        de componentes anteriores (que puedes sumar o restar). Marca qué componentes cuentan para el pago
                        al quicker.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addComp}>
                <Plus className="size-4" /> Componente
              </Button>
            </div>
            <div className="space-y-2">
              {comps.map((c, i) => (
                <ComponentCard
                  key={c.code}
                  c={c}
                  index={i}
                  total={comps.length}
                  earlier={comps.slice(0, i)}
                  onChange={(patch) => setComp(i, patch)}
                  onMove={(dir) => moveComp(i, dir)}
                  onRemove={() => setComps((cs) => cs.filter((_, idx) => idx !== i))}
                />
              ))}
            </div>
          </div>

          {/* Pago al quicker */}
          <div className="rounded-lg border border-line p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink">
              <Wallet className="size-4 text-brand-600" /> Pago al quicker
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-2">Modo</Label>
                <Select value={payoutType} onValueChange={(v) => setPayoutType((v ?? "percent") as PayoutType)}>
                  <SelectTrigger className="h-8">
                    <SelectValue>{(v) => (v === "fixed" ? "Valor fijo ($)" : "Porcentaje (%)")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Valor fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-2">{payoutType === "percent" ? "Porcentaje (%)" : "Valor ($)"}</Label>
                <Input type="number" step="any" value={payoutValue} onChange={(e) => setPayoutValue(e.target.value)} className="h-8" />
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-ink-2">
              {payoutType === "percent"
                ? "Se calcula sobre los componentes marcados como «cuenta para el pago»."
                : "El quicker recibe este valor fijo por servicio."}
            </p>
          </div>

          {/* Simulación */}
          <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700">
              <Calculator className="size-4" /> Simular precio (sin publicar)
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-2">Duración</Label>
                <Select value={sim.duration} onValueChange={(v) => setSim((s) => ({ ...s, duration: v ?? "4" }))}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d} h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-2">Frecuencia</Label>
                <Select value={sim.frequency} onValueChange={(v) => setSim((s) => ({ ...s, frequency: v ?? "unica" }))}>
                  <SelectTrigger className="h-8">
                    <SelectValue>{(v) => FREQUENCIES.find((f) => f.v === v)?.l ?? String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.v} value={f.v}>
                        {f.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-2">Tamaño</Label>
                <Select value={sim.size} onValueChange={(v) => setSim((s) => ({ ...s, size: v ?? "M" }))}>
                  <SelectTrigger className="h-8">
                    <SelectValue>{(v) => SIZES.find((s) => s.v === v)?.l ?? String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s.v} value={s.v}>
                        {s.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={sim.supplies} onCheckedChange={(v) => setSim((s) => ({ ...s, supplies: v }))} aria-label="Insumos" />
                <span className="text-xs text-ink-2">Insumos</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-ink-2">
                <Switch checked={sim.holiday} onCheckedChange={(v) => setSim((s) => ({ ...s, holiday: v }))} aria-label="Día festivo" />
                Día festivo
              </label>
              <Button type="button" size="sm" variant="outline" onClick={runSimulation} disabled={simulate.isPending}>
                {simulate.isPending ? "Calculando…" : "Simular"}
              </Button>
            </div>
            {simResult && (
              <div className="mt-3 border-t border-brand-200 pt-3">
                <Breakdown b={simResult} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-otp" className="text-xs text-ink-2">
              Código 2FA (si está activo)
            </Label>
            <Input
              id="t-otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="max-w-[140px]"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-brand-600 text-white hover:bg-brand-700"
              onClick={submit}
              disabled={publish.isPending}
            >
              {publish.isPending ? "Publicando…" : "Publicar versión"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tarifa vigente + historial ───────────────────────────────────────────────
function TariffPanel({ categoryId, enabled }: { categoryId: string | undefined; enabled: boolean }) {
  const { data, isLoading, isError, refetch } = useTariffs(categoryId, enabled);
  const deactivate = useDeactivateTariff();
  const [showPublish, setShowPublish] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  if (!enabled) {
    return (
      <Card title="Tarifa vigente e historial" icon={Tag}>
        <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (tariff.read)." />
      </Card>
    );
  }
  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const active = data?.active;
  const history = data?.history ?? [];

  return (
    <Card title="Tarifa vigente e historial" icon={Tag}>
      {categoryId && (
        <div className="mb-3 flex justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-brand-600 text-white hover:bg-brand-700"
            onClick={() => setShowPublish(true)}
          >
            <Plus className="size-4" /> Nueva versión
          </Button>
          <PublishDialog categoryId={categoryId} active={active} open={showPublish} onClose={() => setShowPublish(false)} />
        </div>
      )}
      {active ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{active.name}</span>
            <StatusBadge status={active.status} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Vigente desde {fechaCorta(active.effectiveFrom)} · {active.components.length} componentes
          </p>
          <div className="mt-3 border-t border-success/20 pt-3">
            {confirmOff ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-danger">
                  ¿Desactivar esta tarifa? La categoría quedará sin tarifa vigente.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-danger/40 text-danger hover:bg-danger/5"
                  disabled={deactivate.isPending}
                  onClick={() =>
                    deactivate.mutate(active.id, {
                      onSuccess: () => {
                        toast.success("Tarifa desactivada");
                        setConfirmOff(false);
                      },
                      onError: () => toast.error("No se pudo desactivar"),
                    })
                  }
                >
                  Sí, desactivar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmOff(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-danger/40 text-danger hover:bg-danger/5"
                onClick={() => setConfirmOff(true)}
              >
                Desactivar tarifa
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-line bg-bg p-4 text-sm text-faint">
          Esta categoría aún no tiene tarifa vigente.
        </p>
      )}

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-2">Historial de versiones</h3>
      <ul className="flex flex-col gap-2">
        {history.length === 0 ? (
          <li className="text-sm text-faint">Sin versiones.</li>
        ) : (
          history.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{t.name}</p>
                <p className="text-xs text-faint">
                  {fechaCorta(t.effectiveFrom)}
                  {t.effectiveTo ? ` → ${fechaCorta(t.effectiveTo)}` : " → vigente"}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Tarifas() {
  const enabled = !!useSession((s) => s.accessToken);
  const { data: categories, isLoading, isError, refetch } = useServiceCategories();
  const [categoryId, setCategoryId] = useState<string | undefined>();

  useEffect(() => {
    if (!categoryId && categories && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Tarifas</h1>
        <p className="mt-1 text-sm text-ink-2">Tarifas versionadas por categoría y previsualizador de precios.</p>
      </header>

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !categories || categories.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Sin categorías" hint="Aún no hay servicios en el catálogo." />
        </div>
      ) : (
        <>
          <div className="max-w-sm space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-ink-2">
              <ReceiptText className="size-3.5" aria-hidden="true" /> Categoría de servicio
            </Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…">
                  {(v) => categories.find((c) => c.id === v)?.name ?? "Selecciona…"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <TariffPanel categoryId={categoryId} enabled={enabled} />
            <Previewer categoryId={categoryId} />
          </div>
        </>
      )}
    </div>
  );
}
