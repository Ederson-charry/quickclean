import { Link } from "@tanstack/react-router";
import { Clock, MapPin, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cop } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ServiceAssignment } from "@/mocks/types";

const STATUS_LABEL: Record<ServiceAssignment["status"], string> = {
  proximo: "Próximo",
  en_curso: "En curso",
  completado: "Completado",
};

const STATUS_VARIANT: Record<
  ServiceAssignment["status"],
  "default" | "secondary" | "outline"
> = {
  proximo: "outline",
  en_curso: "default",
  completado: "secondary",
};

const STATUS_CLASS: Record<ServiceAssignment["status"], string> = {
  proximo: "border-brand-300 text-brand-600",
  en_curso: "bg-success text-white",
  completado: "bg-line text-ink-2",
};

interface AssignmentCardProps {
  assignment: ServiceAssignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  return (
    <Link
      to="/pro/servicio/$id"
      params={{ id: assignment.id }}
      className={cn(
        "flex items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-all",
        "hover:border-brand-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
        assignment.status === "completado" && "opacity-70",
      )}
      aria-label={`Servicio para ${assignment.clientName} a las ${assignment.time}`}
    >
      {/* Time */}
      <div className="flex shrink-0 flex-col items-center rounded-lg bg-brand-50 px-3 py-2">
        <Clock className="mb-0.5 h-4 w-4 text-brand-600" />
        <span className="text-sm font-semibold text-brand-700">{assignment.time}</span>
        <span className="text-xs text-brand-500">{assignment.durationHours}h</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-ink">{assignment.clientName}</p>
          <Badge
            variant={STATUS_VARIANT[assignment.status]}
            className={cn("shrink-0 text-xs", STATUS_CLASS[assignment.status])}
          >
            {STATUS_LABEL[assignment.status]}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-1 text-sm text-ink-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{assignment.address}</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-success">
          {cop(assignment.payout)}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
