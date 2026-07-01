import { useEffect, useMemo, useState } from "react";
import { Calculator, CalendarClock, Plus, ReceiptText, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import {
  type PriceBreakdown,
  type Tariff,
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

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 text-sm",
        strong && "border-t border-line pt-2 font-semibold text-ink",
      )}
    >
      <span className={cn(strong ? "text-ink" : "text-ink-2")}>{label}</span>
      <span className={cn("tabular-nums", strong ? "text-brand-700" : "text-ink")}>{value}</span>
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
              <SelectValue />
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
              <SelectValue />
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
          <div>
            <PriceRow label="Base por duración" value={cop(data.base)} />
            <PriceRow label="Multiplicador tamaño" value={`× ${data.sizeMultiplier}`} />
            <PriceRow label="Descuento frecuencia" value={`− ${Math.round(data.frequencyDiscount * 100)}%`} />
            <PriceRow label="Mano de obra" value={cop(data.labor)} />
            {data.suppliesCost > 0 && <PriceRow label="Insumos" value={cop(data.suppliesCost)} />}
            <PriceRow label="Comisión plataforma" value={cop(data.platformFee)} />
            <PriceRow label="Total cliente" value={cop(data.total)} strong />
            <PriceRow label="Pago al quicker" value={cop(data.payout)} />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-faint">Selecciona una categoría.</p>
        )}
      </div>
    </Card>
  );
}

// ─── Diálogo: publicar nueva versión ──────────────────────────────────────────
const DIMENSION_OPTS = [
  { v: "duration", l: "Duración (base $)" },
  { v: "frequency", l: "Frecuencia (% desc.)" },
  { v: "size", l: "Tamaño (×)" },
  { v: "supplies", l: "Insumos ($)" },
  { v: "platform_fee", l: "Comisión ($)" },
  { v: "payout_pct", l: "Pago quicker (%)" },
  { v: "holiday", l: "Recargo festivo (%)" },
];
const MODIFIER_OPTS = [
  { v: "base", l: "base" },
  { v: "percent", l: "%" },
  { v: "multiplier", l: "×" },
  { v: "flat", l: "fijo" },
];

interface EditRule {
  dimension: string;
  key: string;
  modifierType: string;
  value: string;
}

function defaultRules(active: Tariff | null | undefined): EditRule[] {
  if (active && active.rules.length) {
    return active.rules.map((r) => ({
      dimension: r.dimension,
      key: r.key,
      modifierType: r.modifierType,
      value: String(r.value),
    }));
  }
  return [
    { dimension: "duration", key: "4", modifierType: "base", value: "79900" },
    { dimension: "frequency", key: "unica", modifierType: "percent", value: "0" },
    { dimension: "size", key: "M", modifierType: "multiplier", value: "1.15" },
    { dimension: "platform_fee", key: "", modifierType: "flat", value: "6900" },
    { dimension: "payout_pct", key: "", modifierType: "percent", value: "0.7" },
  ];
}

function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const publishSchema = z.object({
  name: z.string().min(2),
  effectiveFrom: z.string().min(1),
  rules: z
    .array(
      z.object({
        dimension: z.string().min(1),
        key: z.string(),
        modifierType: z.string().min(1),
        value: z.coerce.number(),
      }),
    )
    .min(1),
  otp: z.string().optional(),
});

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
  const [name, setName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(localNow());
  const [rules, setRules] = useState<EditRule[]>(defaultRules(active));
  const [otp, setOtp] = useState("");
  const [sim, setSim] = useState({ duration: "4", frequency: "unica", size: "M", supplies: false, holiday: false });
  const [simResult, setSimResult] = useState<PriceBreakdown | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setEffectiveFrom(localNow());
      setRules(defaultRules(active));
      setOtp("");
      setSimResult(null);
    }
  }, [open, active]);

  const runSimulation = () => {
    setSimResult(null);
    simulate.mutate(
      {
        rules: rules.map((r) => ({
          dimension: r.dimension,
          key: r.key,
          modifierType: r.modifierType,
          value: Number(r.value) || 0,
        })),
        duration: Number(sim.duration) || 0,
        frequency: sim.frequency,
        size: sim.size,
        supplies: sim.supplies,
        holiday: sim.holiday,
      },
      { onSuccess: (b) => setSimResult(b), onError: () => toast.error("No se pudo simular") },
    );
  };

  const setRule = (i: number, patch: Partial<EditRule>) =>
    setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = () => {
    const parsed = publishSchema.safeParse({ name, effectiveFrom, rules, otp });
    if (!parsed.success) {
      toast.error("Revisa el nombre, la vigencia y las reglas.");
      return;
    }
    publish.mutate(
      {
        serviceCategoryId: categoryId,
        name: parsed.data.name,
        effectiveFrom: new Date(parsed.data.effectiveFrom).toISOString(),
        rules: parsed.data.rules,
        otp: parsed.data.otp || undefined,
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
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
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

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs text-ink-2">Reglas de precio</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRules((rs) => [...rs, { dimension: "duration", key: "", modifierType: "base", value: "0" }])}
              >
                <Plus className="size-4" /> Regla
              </Button>
            </div>
            <div className="space-y-2">
              {rules.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1.4fr_0.8fr_1fr_0.9fr_auto]"
                >
                  <Select value={r.dimension} onValueChange={(v) => setRule(i, { dimension: v ?? "duration" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSION_OPTS.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="clave" value={r.key} onChange={(e) => setRule(i, { key: e.target.value })} />
                  <Select value={r.modifierType} onValueChange={(v) => setRule(i, { modifierType: v ?? "base" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODIFIER_OPTS.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="any"
                    placeholder="valor"
                    value={r.value}
                    onChange={(e) => setRule(i, { value: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar regla"
                    onClick={() => setRules((rs) => rs.filter((_, idx) => idx !== i))}
                    disabled={rules.length <= 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Simulación del cálculo con las reglas de arriba (antes de publicar) */}
          <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700">
              <Calculator className="size-4" /> Simular precio (sin publicar)
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-2">Duración</Label>
                <Input value={sim.duration} onChange={(e) => setSim((s) => ({ ...s, duration: e.target.value }))} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-2">Frecuencia</Label>
                <Input value={sim.frequency} onChange={(e) => setSim((s) => ({ ...s, frequency: e.target.value }))} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-ink-2">Tamaño</Label>
                <Input value={sim.size} onChange={(e) => setSim((s) => ({ ...s, size: e.target.value }))} className="h-8" />
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
              <div className="mt-3 space-y-1 border-t border-brand-200 pt-2 text-sm">
                <PriceRow label="Mano de obra" value={cop(simResult.labor)} />
                {simResult.suppliesCost > 0 && <PriceRow label="Insumos" value={cop(simResult.suppliesCost)} />}
                {simResult.holidaySurcharge > 0 && (
                  <PriceRow label="Recargo festivo" value={cop(simResult.holidaySurcharge)} />
                )}
                <PriceRow label="Comisión plataforma" value={cop(simResult.platformFee)} />
                <PriceRow label="Total al cliente" value={cop(simResult.total)} strong />
                <PriceRow label="Pago al quicker" value={cop(simResult.payout)} />
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
          <PublishDialog
            categoryId={categoryId}
            active={active}
            open={showPublish}
            onClose={() => setShowPublish(false)}
          />
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
            Vigente desde {fechaCorta(active.effectiveFrom)} · {active.rules.length} reglas
          </p>
          <div className="mt-3 border-t border-success/20 pt-3">
            {confirmOff ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-danger">¿Desactivar esta tarifa? La categoría quedará sin tarifa vigente.</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-danger/40 text-danger hover:bg-danger/5"
                  disabled={deactivate.isPending}
                  onClick={() =>
                    deactivate.mutate(active.id, {
                      onSuccess: () => { toast.success("Tarifa desactivada"); setConfirmOff(false); },
                      onError: () => toast.error("No se pudo desactivar"),
                    })
                  }
                >
                  Sí, desactivar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmOff(false)}>Cancelar</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="border-danger/40 text-danger hover:bg-danger/5" onClick={() => setConfirmOff(true)}>
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

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-2">
        Historial de versiones
      </h3>
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
                <SelectValue placeholder="Selecciona…" />
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
