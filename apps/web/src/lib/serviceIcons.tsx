import {
  Bath,
  Bed,
  Brush,
  Bug,
  Building2,
  Car,
  Droplets,
  HardHat,
  type LucideIcon,
  PawPrint,
  Shirt,
  Sofa,
  SprayCan,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  Trees,
  Utensils,
  WashingMachine,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Registro único de iconos para categorías de servicio. La clave es el nombre
 * lucide guardado en `serviceCategory.iconName`. Todo el catálogo (admin y
 * cliente) resuelve el icono desde aquí, así lo que se elige es lo que se ve.
 */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Wind,
  Droplets,
  SprayCan,
  Brush,
  WashingMachine,
  Bath,
  Sofa,
  Bed,
  Building2,
  HardHat,
  Wrench,
  Zap,
  Trash2,
  Bug,
  PawPrint,
  Shirt,
  Utensils,
  Trees,
  Sun,
  Car,
  Tag,
};

/** Nombres disponibles para el selector de iconos. */
export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS);

/** Icono de una categoría por nombre; usa Tag como respaldo si no existe. */
export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = SERVICE_ICONS[name] ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}
