import { useBooking } from "@/stores/booking";
import type { ServiceType } from "@/mocks/types";
import { cn } from "@/lib/utils";
import { Droplets, Sparkles, Wrench, Zap } from "lucide-react";

const SERVICE_OPTIONS: { type: ServiceType; label: string; desc: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { type: "hogar", label: "Aseo de Hogar", desc: "Sala, habitaciones, cocina y baños", Icon: Droplets },
  { type: "profundo", label: "Aseo Profundo", desc: "Limpieza intensiva y zonas difíciles", Icon: Sparkles },
  { type: "plomeria", label: "Plomería Express", desc: "Fugas, llaves, mantenimiento", Icon: Wrench },
  { type: "electricista", label: "Electricista", desc: "Tomas, interruptores, lámparas", Icon: Zap },
];

const SIZE_OPTIONS = [
  { value: "estudio" as const, label: "Estudio", desc: "≤ 40 m²" },
  { value: "1-2" as const, label: "1–2 hab.", desc: "40–80 m²" },
  { value: "3+" as const, label: "3+ hab.", desc: "80–150 m²" },
  { value: "casa" as const, label: "Casa", desc: "> 150 m²" },
];

export function Step1Tipo() {
  const { data, set } = useBooking();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-ink mb-1">¿Qué servicio necesitas?</h2>
        <p className="text-sm text-muted">Selecciona el tipo de limpieza</p>
      </div>

      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Tipo de servicio">
        {SERVICE_OPTIONS.map(({ type, label, desc, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => set({ serviceType: type })}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 min-h-[88px]",
              data.serviceType === type
                ? "border-brand-600 bg-brand-50"
                : "border-line bg-surface hover:border-brand-300",
            )}
            aria-pressed={data.serviceType === type}
          >
            <Icon className={cn("h-6 w-6", data.serviceType === type ? "text-brand-600" : "text-muted")} aria-hidden="true" />
            <div>
              <p className={cn("font-medium text-sm", data.serviceType === type ? "text-brand-700" : "text-ink")}>
                {label}
              </p>
              <p className="text-xs text-muted mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div>
        <h2 className="font-semibold text-ink mb-1">Tamaño del espacio</h2>
        <p className="text-sm text-muted mb-3">¿Cuánto mide el lugar?</p>
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Tamaño del espacio">
          {SIZE_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => set({ size: value })}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 min-h-[64px]",
                data.size === value
                  ? "border-brand-600 bg-brand-50"
                  : "border-line bg-surface hover:border-brand-300",
              )}
              aria-pressed={data.size === value}
            >
              <p className={cn("font-medium text-sm", data.size === value ? "text-brand-700" : "text-ink")}>
                {label}
              </p>
              <p className="text-xs text-muted">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
