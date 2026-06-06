import { useBooking } from "@/stores/booking";
import type { Duration } from "@/mocks/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cop } from "@/lib/format";
import { basePrice } from "@/lib/pricing";

const DURATION_OPTIONS: { value: Duration; label: string; desc: string; popular?: boolean }[] = [
  { value: 4, label: "4 horas", desc: "Ideal para estudios y aptos pequeños" },
  { value: 6, label: "6 horas", desc: "Para apartamentos medianos", popular: true },
  { value: 8, label: "8 horas", desc: "Casas grandes o aseo profundo" },
];

export function Step3Duracion() {
  const { data, set } = useBooking();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-ink mb-1">Duración del servicio</h2>
        <p className="text-sm text-muted">Elige cuántas horas necesitas</p>
      </div>

      <div className="space-y-3">
        {DURATION_OPTIONS.map(({ value, label, desc, popular }) => (
          <button
            key={value}
            type="button"
            onClick={() => set({ duration: value })}
            aria-pressed={data.duration === value}
            className={cn(
              "w-full flex items-center justify-between rounded-xl border-2 px-4 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
              data.duration === value
                ? "border-brand-600 bg-brand-50"
                : "border-line bg-surface hover:border-brand-300",
            )}
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className={cn("font-medium", data.duration === value ? "text-brand-700" : "text-ink")}>
                    {label}
                  </p>
                  {popular && (
                    <Badge className="bg-brand-100 text-brand-700 border-brand-200 text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </div>
            <span className={cn("font-semibold", data.duration === value ? "text-brand-700" : "text-ink-2")}>
              {cop(basePrice(value))}
            </span>
          </button>
        ))}
      </div>

      {/* Supplies toggle */}
      <div className="rounded-xl border border-line bg-surface p-4 flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="supplies-toggle" className="font-medium text-ink cursor-pointer">
            Implementos de aseo
          </Label>
          <p className="text-sm text-muted mt-0.5">
            Incluye productos y materiales · +{cop(15000)}
          </p>
        </div>
        <Switch
          id="supplies-toggle"
          checked={data.supplies}
          onCheckedChange={(checked) => set({ supplies: checked })}
          aria-label="Incluir implementos de aseo"
        />
      </div>
    </div>
  );
}
