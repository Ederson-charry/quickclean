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
  date?: string;
  time?: string;
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
  date,
  time,
  className,
}: PriceSummaryProps) {
  const price = useBookingPrice({ duration, frequency, supplies, size, serviceCategoryId, date, time });
  // Líneas visibles al cliente (el motor marca cuáles ocultar, p. ej. comisión interna).
  const clientLines = price.breakdown?.lines.filter((l) => l.visibleToClient) ?? [];
  const holiday = clientLines.find((l) => l.code === "festivo")?.amount ?? 0;

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
            {clientLines.map((line) => (
              <Row
                key={line.code}
                label={line.nature === "base" ? `${line.label} (${duration}h)` : line.label}
                value={`${line.amount < 0 ? "−" : ""}${cop(Math.abs(line.amount))}`}
                valueClass={
                  line.nature === "discount"
                    ? "text-success"
                    : line.code === "festivo"
                      ? "text-warning"
                      : line.nature === "base"
                        ? "text-ink"
                        : "text-ink-2"
                }
              />
            ))}
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

      {holiday > 0 && (
        <p className="mt-2 rounded-md bg-warning/10 px-2 py-1 text-center text-xs font-medium text-warning">
          🎉 Día festivo — aplica recargo
        </p>
      )}

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
