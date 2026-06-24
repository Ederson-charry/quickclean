import type { Duration, Frequency } from "@/mocks/types";
import { basePrice, discount, SUPPLIES_FEE, PLATFORM_FEE } from "@/lib/pricing";
import { useBookingPrice } from "@/hooks/bookingPrice";
import { cop } from "@/lib/format";
import { Separator } from "@/components/ui/separator";

interface PriceSummaryProps {
  duration: Duration;
  frequency: Frequency;
  supplies: boolean;
  size?: string;
  serviceCategoryId?: string;
  className?: string;
}

const FREQ_LABELS: Record<Frequency, string> = {
  unico: "Sin descuento",
  semanal: "Semanal −20%",
  quincenal: "Quincenal −12%",
  mensual: "Mensual −8%",
};

export function PriceSummary({
  duration,
  frequency,
  supplies,
  size,
  serviceCategoryId,
  className,
}: PriceSummaryProps) {
  const price = useBookingPrice({ duration, frequency, supplies, size, serviceCategoryId });

  return (
    <div className={`rounded-xl border border-line bg-surface p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">Resumen de precio</h3>
        {price.isReal && (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">En vivo</span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {price.isReal && price.breakdown ? (
          <>
            <Row label={`Servicio base (${duration}h)`} value={cop(price.breakdown.base)} />
            {price.breakdown.sizeMultiplier !== 1 && (
              <Row label="Ajuste por tamaño" value={`× ${price.breakdown.sizeMultiplier}`} />
            )}
            {price.breakdown.frequencyDiscount > 0 && (
              <Row
                label={FREQ_LABELS[frequency]}
                value={`−${Math.round(price.breakdown.frequencyDiscount * 100)}%`}
                valueClass="text-success"
              />
            )}
            {price.breakdown.suppliesCost > 0 && (
              <Row label="Implementos de aseo" value={cop(price.breakdown.suppliesCost)} />
            )}
            <Row label="Tarifa plataforma" value={cop(price.breakdown.platformFee)} valueClass="text-ink-2" />
          </>
        ) : (
          <>
            <Row label={`Servicio base (${duration}h)`} value={cop(basePrice(duration))} />
            {discount(frequency) > 0 && (
              <Row
                label={FREQ_LABELS[frequency]}
                value={`−${cop(Math.round(basePrice(duration) * discount(frequency)))}`}
                valueClass="text-success"
              />
            )}
            {supplies && <Row label="Implementos de aseo" value={cop(SUPPLIES_FEE)} />}
            <Row label="Tarifa plataforma" value={cop(PLATFORM_FEE)} valueClass="text-ink-2" />
          </>
        )}
      </div>

      <Separator className="my-3" />

      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-ink">Total</span>
        <span className="text-xl font-bold text-brand-600">{cop(price.total)}</span>
      </div>

      {frequency !== "unico" && (
        <p className="mt-2 text-right text-xs text-ink-2">Por servicio · recurrencia automática</p>
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
    <div className="flex items-center justify-between">
      <span className="text-ink-2">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
