import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useBooking } from "@/stores/booking";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, MapPin, UserCog } from "lucide-react";
import { cop, fechaLarga } from "@/lib/format";
import type { Booking } from "@/mocks/types";

interface ConfirmacionProps {
  booking: Booking;
  categoryName?: string;
}

const SERVICE_LABELS: Record<string, string> = {
  hogar: "Aseo de Hogar",
  profundo: "Aseo Profundo",
  plomeria: "Plomería Express",
  electricista: "Electricista",
};

export function Confirmacion({ booking, categoryName }: ConfirmacionProps) {
  const { reset } = useBooking();

  useEffect(() => {
    reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const title = categoryName ?? SERVICE_LABELS[booking.serviceType] ?? "Servicio";

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      {/* Success icon */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink">¡Reserva confirmada!</h1>
          <p className="mt-1 text-faint">Tu servicio ha sido agendado con éxito</p>
        </div>
      </div>

      {/* Booking summary card */}
      <div className="space-y-4 rounded-xl border border-line bg-surface p-5 text-left">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">{title}</h2>
          <Badge className="border-brand-200 bg-brand-100 text-brand-700">Agendado</Badge>
        </div>

        <div className="space-y-2 text-sm text-ink-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-faint" />
            <span className="capitalize">
              {fechaLarga(booking.date)} · {booking.time} · {booking.duration}h
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-faint" />
            <span className="truncate">{booking.address}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-1">
          <span className="text-sm text-faint">Total pagado</span>
          <span className="font-bold text-brand-600">{cop(booking.total)}</span>
        </div>
      </div>

      {/* Estado de asignación (honesto: aún no hay profesional asignado) */}
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-5 text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50">
          <UserCog className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <p className="font-semibold text-ink">Asignaremos tu profesional pronto</p>
          <p className="mt-0.5 text-sm text-ink-2">
            Nuestro equipo elegirá al quicker idóneo para tu servicio. Te avisaremos cuando esté asignado.
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/app/servicios"
          className={buttonVariants({ className: "flex-1 bg-brand-600 text-white hover:bg-brand-700" })}
        >
          Ver mis servicios
        </Link>
        <Link to="/app" className={buttonVariants({ variant: "outline", className: "flex-1 border-line" })}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
