import { useBooking } from "@/stores/booking";
import type { Frequency } from "@/mocks/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const FREQ_OPTIONS: {
  value: Frequency;
  label: string;
  sublabel: string;
  discount?: string;
}[] = [
  { value: "unico", label: "Servicio único", sublabel: "Sin compromiso", },
  { value: "semanal", label: "Semanal", sublabel: "Cada 7 días", discount: "−20%" },
  { value: "quincenal", label: "Quincenal", sublabel: "Cada 15 días", discount: "−12%" },
  { value: "mensual", label: "Mensual", sublabel: "Una vez al mes", discount: "−8%" },
];

export function Step2Frecuencia() {
  const { data, set } = useBooking();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-ink mb-1">¿Con qué frecuencia?</h2>
        <p className="text-sm text-faint">Los planes recurrentes tienen descuento</p>
      </div>

      <div
        className="space-y-3"
        role="radiogroup"
        aria-label="Frecuencia del servicio"
      >
        {FREQ_OPTIONS.map(({ value, label, sublabel, discount }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={data.frequency === value}
            onClick={() => set({ frequency: value })}
            className={cn(
              "w-full flex items-center justify-between rounded-xl border-2 px-4 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
              data.frequency === value
                ? "border-brand-600 bg-brand-50"
                : "border-line bg-surface hover:border-brand-300",
            )}
          >
            <div>
              <p className={cn("font-medium", data.frequency === value ? "text-brand-700" : "text-ink")}>
                {label}
              </p>
              <p className="text-sm text-faint">{sublabel}</p>
            </div>
            {discount && (
              <Badge className="bg-success/10 text-success border-success/20 font-semibold">
                {discount}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
