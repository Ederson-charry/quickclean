import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { useMyBookings } from "@/hooks/queries";
import { BookingCard } from "@/components/shared/BookingCard";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/States";
import { Star } from "lucide-react";

export default function MisServicios() {
  const { data: bookings, isLoading, isError, refetch } = useMyBookings();

  if (isLoading) return <LoadingState rows={3} />;
  if (isError) return <ErrorState onRetry={refetch} />;

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
      <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink">
        Mis servicios
      </h1>

      <div className="space-y-3">
        {bookings.map((booking) => {
          const canRate = booking.status === "completado" && !booking.rated;

          return (
            <BookingCard
              key={booking.id}
              booking={booking}
              action={
                canRate ? (
                  <Link
                    to="/app/servicios/$id/calificar"
                    params={{ id: booking.id }}
                    className={buttonVariants({ size: "sm", variant: "outline", className: "border-brand-200 text-brand-600 hover:bg-brand-50 gap-1.5" })}
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
