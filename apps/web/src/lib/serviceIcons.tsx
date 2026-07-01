import {
  Armchair,
  Bath,
  Bed,
  BedDouble,
  Brush,
  Bug,
  Building,
  Building2,
  Car,
  Cat,
  CookingPot,
  Dog,
  DoorOpen,
  Droplets,
  Fan,
  Flame,
  Flower2,
  GlassWater,
  Hammer,
  HardHat,
  KeyRound,
  Lamp,
  Leaf,
  Lightbulb,
  type LucideIcon,
  Microwave,
  PaintRoller,
  Paintbrush,
  PawPrint,
  Plug,
  Recycle,
  Refrigerator,
  Scissors,
  Shirt,
  ShowerHead,
  Snowflake,
  Sofa,
  Sparkles,
  SprayCan,
  Store,
  Sun,
  Tag,
  Trash2,
  Trees,
  Utensils,
  Warehouse,
  WashingMachine,
  Waves,
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
  // Limpieza
  Sparkles,
  Wind,
  Droplets,
  SprayCan,
  Brush,
  Paintbrush,
  PaintRoller,
  WashingMachine,
  Recycle,
  Trash2,
  Waves,
  Snowflake,
  // Baño / agua
  Bath,
  ShowerHead,
  GlassWater,
  // Muebles / hogar
  Sofa,
  Armchair,
  Bed,
  BedDouble,
  Lamp,
  DoorOpen,
  KeyRound,
  // Cocina / electrodomésticos
  Refrigerator,
  Microwave,
  CookingPot,
  Utensils,
  Fan,
  // Mantenimiento / obra
  HardHat,
  Hammer,
  Wrench,
  Plug,
  Lightbulb,
  Zap,
  Flame,
  Scissors,
  // Edificaciones
  Building,
  Building2,
  Warehouse,
  Store,
  // Jardín / exteriores
  Trees,
  Leaf,
  Flower2,
  Sun,
  Car,
  // Mascotas / ropa
  PawPrint,
  Cat,
  Dog,
  Bug,
  Shirt,
  // Genérico
  Tag,
};

/** Nombres disponibles para el selector de iconos. */
export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS);

/** Icono de una categoría por nombre; usa Tag como respaldo si no existe. */
export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = SERVICE_ICONS[name] ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}
