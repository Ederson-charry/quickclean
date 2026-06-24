import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMyBookings } from "@/hooks/queries";
import { type ClientBooking, useCancelReservation, useMyReservations } from "@/hooks/catalog";
import { BookingCard } from "@/components/shared/BookingCard";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/States";
import type { Booking, Duration, Frequency, ServiceType } from "@/mocks/types";
import { useSession } from "@/stores/session";
import { Star, X } from "lucide-react";
import { toast } from "sonner";

function slugToType(slug: string | undefined): ServiceType {
  if (slug && (slug.includes("profund") || slug.includes("post-obra"))) return "profundo";
  return "hogar";
}

// Mapea la reserva real del backend al shape que pinta BookingCard.
function realToBooking(b: ClientBooking): Booking {
  return {
    id: b.id,
    serviceType: slugToType(b.category?.slug),
    size: "1-2",
    frequency: (b.frequency === "unica" ? "unico" : b.frequency) as Frequency,
    duration: b.duration as Duration,
    supplies: b.supplies,
    date: b.scheduledAt.slice(0, 10),
    time: b.scheduledAt.slice(11, 16),
    address: b.address,
    pets: false,
    total: b.priceTotal,
    status: b.status,
    rated: !!b.ratedAt,
  };
}

export default function MisServicios() {
  const token = useSession((s) => s.accessToken);
  const useReal = !!token;

  const real = useMyReservations(useReal);
  const mock = useMyBookings();
  const cancel = useCancelReservation();

  const isLoading = useReal ? real.isLoading : mock.isLoading;
  const isError = useReal ? real.isError : mock.isError;
  const refetch = useReal ? real.refetch : mock.refetch;
  const bookings: Booking[] | undefined = useReal ? real.data?.map(realToBooking) : mock.data;

  if (isLoading) return <LoadingState rows={3} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (!bookings || bookings.length === 0) {
    return (
      <EmptyState
        title="Sin servicios aún"
        hint="Agenda tu primer servicio y aparecerá aquí"
        action={
          <Link
            to="/app/reservar"
            className={buttonVariants({ className: "bg-brand-600 hover:bg-brand-700 text-white" })}
          >
            Agendar ahora
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink">Mis servicios</h1>

      <div className="space-y-3">
        {bookings.map((booking) => {
          const canRate = booking.status === "completado" && !booking.rated;
          const canCancel = useReal && (booking.status === "agendado" || booking.status === "en_curso");
          return (
            <BookingCard
              key={booking.id}
              booking={booking}
              action={
                canCancel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-danger/30 text-danger hover:bg-danger/5"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(booking.id, {
                        onSuccess: () => toast.success("Reserva cancelada"),
                        onError: () => toast.error("No se pudo cancelar"),
                      })
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                ) : canRate ? (
                  <Link
                    to="/app/servicios/$id/calificar"
                    params={{ id: booking.id }}
                    className={buttonVariants({
                      size: "sm",
                      variant: "outline",
                      className: "border-brand-200 text-brand-600 hover:bg-brand-50 gap-1.5",
                    })}
                  >
                    <Star className="h-3.5 w-3.5" />
                    Calificar
                  </Link>
                ) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
