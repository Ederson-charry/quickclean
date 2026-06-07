import { useEffect } from "react";
import { useBooking } from "@/stores/booking";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Star, MapPin, Clock } from "lucide-react";
import { cop, fechaLarga } from "@/lib/format";
import type { Booking } from "@/mocks/types";
import { db } from "@/mocks/db";

interface ConfirmacionProps {
  booking: Booking;
}

export function Confirmacion({ booking }: ConfirmacionProps) {
  const { reset } = useBooking();

  useEffect(() => {
    reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Look up the assigned quicker (Carolina)
  const quicker = db.quickers.find((q) => q.id === booking.quickerId) ?? db.quickers[1];

  const SERVICE_LABELS: Record<string, string> = {
    hogar: "Aseo de Hogar",
    profundo: "Aseo Profundo",
    plomeria: "Plomería Express",
    electricista: "Electricista",
  };

  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      {/* Success icon */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink">
            ¡Reserva confirmada!
          </h1>
          <p className="text-faint mt-1">Tu servicio ha sido agendado con éxito</p>
        </div>
      </div>

      {/* Booking summary card */}
      <div className="rounded-xl border border-line bg-surface p-5 text-left space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">{SERVICE_LABELS[booking.serviceType]}</h2>
          <Badge className="bg-brand-100 text-brand-700 border-brand-200">Agendado</Badge>
        </div>

        <div className="space-y-2 text-sm text-ink-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-faint" />
            <span className="capitalize">{fechaLarga(booking.date)} · {booking.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-faint" />
            <span className="truncate">{booking.address}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-line">
          <span className="text-sm text-faint">Total pagado</span>
          <span className="font-bold text-brand-600">{cop(booking.total)}</span>
        </div>
      </div>

      {/* Assigned quicker */}
      <div className="rounded-xl border border-line bg-surface p-5">
        <p className="text-sm text-faint mb-3">Tu Quicker asignada</p>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-brand-100 text-brand-700 font-semibold">
              {quicker.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="font-semibold text-ink">{quicker.name}</p>
            <div className="flex items-center gap-1 text-sm text-ink-2">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span>{quicker.rating.toFixed(1)}</span>
              <span>·</span>
              <span>{quicker.monthlyServices} servicios este mes</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/app/servicios"
          className={buttonVariants({ className: "flex-1 bg-brand-600 hover:bg-brand-700 text-white" })}
        >
          Ver mis servicios
        </a>
        <a
          href="/app"
          className={buttonVariants({ variant: "outline", className: "flex-1 border-line" })}
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
