import type { Duration, Frequency } from "@/mocks/types";
import { basePrice, discount, serviceValue, SUPPLIES_FEE, PLATFORM_FEE } from "@/lib/pricing";
import { cop } from "@/lib/format";
import { Separator } from "@/components/ui/separator";

interface PriceSummaryProps {
  duration: Duration;
  frequency: Frequency;
  supplies: boolean;
  className?: string;
}

const FREQ_LABELS: Record<Frequency, string> = {
  unico: "Sin descuento",
  semanal: "Semanal −20%",
  quincenal: "Quincenal −12%",
  mensual: "Mensual −8%",
};

export function PriceSummary({ duration, frequency, supplies, className }: PriceSummaryProps) {
  const base = basePrice(duration);
  const disc = discount(frequency);
  const discAmount = Math.round(base * disc);
  const svc = serviceValue({ duration, frequency });
  const total = svc + (supplies ? SUPPLIES_FEE : 0) + PLATFORM_FEE;

  return (
    <div className={`rounded-xl border border-line bg-surface p-4 ${className ?? ""}`}>
      <h3 className="font-semibold text-ink mb-3 text-sm uppercase tracking-wide">Resumen de precio</h3>

      <div className="space-y-2 text-sm">
        <Row label={`Servicio base (${duration}h)`} value={cop(base)} />

        {disc > 0 && (
          <Row
            label={FREQ_LABELS[frequency]}
            value={`−${cop(discAmount)}`}
            valueClass="text-success"
          />
        )}

        {supplies && (
          <Row label="Implementos de aseo" value={cop(SUPPLIES_FEE)} />
        )}

        <Row label="Tarifa plataforma" value={cop(PLATFORM_FEE)} valueClass="text-muted" />
      </div>

      <Separator className="my-3" />

      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-ink">Total</span>
        <span className="text-xl font-bold text-brand-600">{cop(total)}</span>
      </div>

      {frequency !== "unico" && (
        <p className="mt-2 text-xs text-muted text-right">
          Por servicio · recurrencia automática
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "text-ink",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-ink-2">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
