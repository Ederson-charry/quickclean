import { useBooking } from "@/stores/booking";
import type { ServiceType } from "@/mocks/types";
import { useServiceCategories } from "@/hooks/catalog";
import { cn } from "@/lib/utils";
import {
  Bath,
  Brush,
  Building2,
  Droplets,
  HardHat,
  type LucideIcon,
  Sofa,
  Sparkles,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

interface ServiceOption {
  key: string;
  serviceType: ServiceType;
  categoryId?: string;
  categoryName?: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
}

// Opciones del demo (fallback cuando el backend no está disponible).
const DEMO_OPTIONS: ServiceOption[] = [
  { key: "hogar", serviceType: "hogar", label: "Aseo de Hogar", desc: "Sala, habitaciones, cocina y baños", Icon: Droplets },
  { key: "profundo", serviceType: "profundo", label: "Aseo Profundo", desc: "Limpieza intensiva y zonas difíciles", Icon: Sparkles },
  { key: "plomeria", serviceType: "plomeria", label: "Plomería Express", desc: "Fugas, llaves, mantenimiento", Icon: Wrench },
  { key: "electricista", serviceType: "electricista", label: "Electricista", desc: "Tomas, interruptores, lámparas", Icon: Zap },
];

const ICONS: Record<string, LucideIcon> = { Sparkles, Wind, HardHat, Sofa, Bath, Brush, Building2, Droplets, Wrench, Zap };

// Mapea el slug real a un ServiceType del demo (para el resto del flujo mock).
function slugToServiceType(slug: string): ServiceType {
  if (slug.includes("profund") || slug.includes("post-obra")) return "profundo";
  return "hogar";
}

const SIZE_OPTIONS = [
  { value: "estudio" as const, label: "Estudio", desc: "≤ 40 m²" },
  { value: "1-2" as const, label: "1–2 hab.", desc: "40–80 m²" },
  { value: "3+" as const, label: "3+ hab.", desc: "80–150 m²" },
  { value: "casa" as const, label: "Casa", desc: "> 150 m²" },
];

export function Step1Tipo() {
  const { data, set } = useBooking();
  const { data: categories } = useServiceCategories();

  // Catálogo real si está disponible; si no, las opciones del demo.
  const options: ServiceOption[] =
    categories && categories.length > 0
      ? categories.map((c) => ({
          key: c.id,
          serviceType: slugToServiceType(c.slug),
          categoryId: c.id,
          categoryName: c.name,
          label: c.name,
          desc: c.description ?? "Servicio de limpieza",
          Icon: ICONS[c.iconName] ?? Sparkles,
        }))
      : DEMO_OPTIONS;

  const isSelected = (opt: ServiceOption) =>
    opt.categoryId ? data.serviceCategoryId === opt.categoryId : !data.serviceCategoryId && data.serviceType === opt.serviceType;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-ink mb-1">¿Qué servicio necesitas?</h2>
        <p className="text-sm text-faint">Selecciona el tipo de limpieza</p>
      </div>

      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Tipo de servicio">
        {options.map((opt) => {
          const selected = isSelected(opt);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() =>
                set({
                  serviceType: opt.serviceType,
                  serviceCategoryId: opt.categoryId,
                  serviceCategoryName: opt.categoryName,
                })
              }
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 min-h-[88px]",
                selected ? "border-brand-600 bg-brand-50" : "border-line bg-surface hover:border-brand-300",
              )}
              aria-pressed={selected}
            >
              <opt.Icon className={cn("h-6 w-6", selected ? "text-brand-600" : "text-faint")} aria-hidden="true" />
              <div>
                <p className={cn("font-medium text-sm", selected ? "text-brand-700" : "text-ink")}>{opt.label}</p>
                <p className="text-xs text-faint mt-0.5 line-clamp-2">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <h2 className="font-semibold text-ink mb-1">Tamaño del espacio</h2>
        <p className="text-sm text-faint mb-3">¿Cuánto mide el lugar?</p>
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Tamaño del espacio">
          {SIZE_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => set({ size: value })}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 min-h-[64px]",
                data.size === value ? "border-brand-600 bg-brand-50" : "border-line bg-surface hover:border-brand-300",
              )}
              aria-pressed={data.size === value}
            >
              <p className={cn("font-medium text-sm", data.size === value ? "text-brand-700" : "text-ink")}>{label}</p>
              <p className="text-xs text-faint">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
