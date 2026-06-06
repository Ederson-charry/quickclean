import type { Booking } from "@/mocks/types";
import { Badge } from "@/components/ui/badge";
import { cop, fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { CalendarDays, Clock } from "lucide-react";

const STATUS_MAP: Record<
  Booking["status"],
  { label: string; className: string }
> = {
  agendado: { label: "Agendado", className: "bg-brand-100 text-brand-700 border-brand-200" },
  en_curso: { label: "En curso", className: "bg-warning/10 text-warning border-warning/20" },
  completado: { label: "Completado", className: "bg-success/10 text-success border-success/20" },
  cancelado: { label: "Cancelado", className: "bg-danger/10 text-danger border-danger/20" },
};

const SERVICE_LABELS: Record<string, string> = {
  hogar: "Aseo de Hogar",
  profundo: "Aseo Profundo",
  plomeria: "Plomería Express",
  electricista: "Electricista",
};

interface BookingCardProps {
  booking: Booking;
  action?: ReactNode;
  className?: string;
}

export function BookingCard({ booking, action, className }: BookingCardProps) {
  const status = STATUS_MAP[booking.status];

  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface p-4 hover:shadow-sm hover:border-brand-200 transition-all duration-200",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-ink truncate">
              {SERVICE_LABELS[booking.serviceType] ?? booking.serviceType}
            </h3>
            <Badge variant="outline" className={cn("shrink-0 text-xs", status.className)}>
              {status.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {fechaCorta(booking.date)} · {booking.time}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {booking.duration}h
            </span>
          </div>

          <p className="mt-2 text-xs text-muted truncate">{booking.address}</p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="font-semibold text-ink">{cop(booking.total)}</span>
          {action}
        </div>
      </div>
    </div>
  );
}
