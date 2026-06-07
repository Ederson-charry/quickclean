import { useState } from "react";
import { useBooking } from "@/stores/booking";
import { PriceSummary } from "@/components/shared/PriceSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentStep } from "./PaymentStep";
import { Confirmacion } from "./Confirmacion";
import { cop, fechaCorta } from "@/lib/format";
import { CalendarDays, Clock, MapPin, Tag, ArrowRight } from "lucide-react";
import type { Booking } from "@/mocks/types";

const SERVICE_LABELS: Record<string, string> = {
  hogar: "Aseo de Hogar",
  profundo: "Aseo Profundo",
  plomeria: "Plomería Express",
  electricista: "Electricista",
};

const FREQ_LABELS: Record<string, string> = {
  unico: "Servicio único",
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
};

type View = "resumen" | "pago" | "confirmacion";

export function Step5Resumen() {
  const { data, total } = useBooking();
  const [view, setView] = useState<View>("resumen");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  if (view === "confirmacion" && confirmedBooking) {
    return <Confirmacion booking={confirmedBooking} />;
  }

  if (view === "pago") {
    return (
      <PaymentStep
        onSuccess={(booking) => {
          setConfirmedBooking(booking);
          setView("confirmacion");
        }}
      />
    );
  }

  // Resumen view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-ink mb-1">Resumen de tu reserva</h2>
        <p className="text-sm text-muted">Revisa los detalles antes de pagar</p>
      </div>

      {/* Service details */}
      <div className="rounded-xl border border-line bg-bg/50 p-4 space-y-3">
        <h3 className="font-semibold text-ink">
          {SERVICE_LABELS[data.serviceType ?? "hogar"]}
        </h3>

        <div className="space-y-2 text-sm text-ink-2">
          {data.date && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
              <span className="capitalize">{fechaCorta(data.date)}</span>
            </div>
          )}
          {data.time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-muted" />
              <span>{data.time} · {data.duration}h · {FREQ_LABELS[data.frequency]}</span>
            </div>
          )}
          {data.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate">{data.address}</span>
            </div>
          )}
          {data.supplies && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0 text-muted" />
              <span>Implementos incluidos</span>
            </div>
          )}
        </div>
      </div>

      {/* Price breakdown */}
      <PriceSummary
        duration={data.duration}
        frequency={data.frequency}
        supplies={data.supplies}
      />

      {/* Coupon field (decorative) */}
      <div className="space-y-2">
        <Label htmlFor="coupon">¿Tienes un cupón?</Label>
        <div className="flex gap-2">
          <Input
            id="coupon"
            placeholder="Ingresa tu código"
            className="border-line"
          />
          <Button variant="outline" className="border-line shrink-0">
            Aplicar
          </Button>
        </div>
      </div>

      {/* Total + CTA */}
      <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-ink">Total</span>
          <span className="text-2xl font-bold text-brand-600">{cop(total())}</span>
        </div>
        <Button
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold h-12 gap-2"
          onClick={() => setView("pago")}
        >
          Ir a pagar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
