import type { Service } from "@/mocks/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, Droplets, Wrench, Zap } from "lucide-react";

const SERVICE_ICONS = {
  hogar: Droplets,
  profundo: Sparkles,
  plomeria: Wrench,
  electricista: Zap,
};

const SERVICE_GRADIENTS = {
  hogar: "from-brand-500 to-brand-700",
  profundo: "from-violet-500 to-violet-700",
  plomeria: "from-sky-500 to-sky-700",
  electricista: "from-amber-500 to-amber-700",
};

interface ServiceCardProps {
  service: Service;
  onSelect?: (service: Service) => void;
  className?: string;
}

export function ServiceCard({ service, onSelect, className }: ServiceCardProps) {
  const Icon = SERVICE_ICONS[service.type];
  const gradient = SERVICE_GRADIENTS[service.type];

  return (
    <div
      className={cn(
        "group rounded-xl border border-line bg-surface overflow-hidden shadow-sm hover:shadow-md transition-shadow",
        className,
      )}
    >
      {/* Gradient header */}
      <div className={cn("h-28 bg-gradient-to-br flex items-center justify-center", gradient)}>
        <Icon className="h-10 w-10 text-white/90" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-ink mb-1">{service.name}</h3>
        <p className="text-sm text-muted line-clamp-2 mb-3">{service.desc}</p>
        {onSelect && (
          <Button
            size="sm"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => onSelect(service)}
          >
            Agendar
          </Button>
        )}
      </div>
    </div>
  );
}
