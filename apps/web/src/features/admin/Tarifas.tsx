import { useEffect, useMemo, useState } from "react";
import { Calculator, CalendarClock, ReceiptText, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  type Tariff,
  useServiceCategories,
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

// ─── Tarifa vigente + historial ───────────────────────────────────────────────
function TariffPanel({ categoryId, enabled }: { categoryId: string | undefined; enabled: boolean }) {
  const { data, isLoading, isError, refetch } = useTariffs(categoryId, enabled);

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
