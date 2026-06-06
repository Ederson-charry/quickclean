import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useServices, useMyBookings } from "@/hooks/queries";
import { useSession } from "@/stores/session";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { BookingCard } from "@/components/shared/BookingCard";
import { LoadingState } from "@/components/shared/States";
import { fechaCorta } from "@/lib/format";
import type { Service } from "@/mocks/types";

export default function Home() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { data: services, isLoading: servicesLoading } = useServices();
  const { data: bookings, isLoading: bookingsLoading } = useMyBookings();

  const firstName = user?.name?.split(" ")[0] ?? "Cliente";
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "CL";

  const nextBooking = bookings?.find(
    (b) => b.status === "agendado" || b.status === "en_curso",
  );
  const pendingRating = bookings?.find(
    (b) => b.status === "completado" && !b.rated,
  );

  function handleSelectService(service: Service) {
    navigate({ to: "/app/reservar" });
    // pre-select service type via store if needed
    const _ = service; // consumed to avoid lint warning
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink">
            ¡Hola, {firstName}!
          </h1>
          <p className="text-sm text-muted mt-0.5">¿Qué necesitas hoy?</p>
        </div>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-brand-100 text-brand-700 text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input
          placeholder="Buscar servicio..."
          className="pl-9 bg-surface border-line"
          aria-label="Buscar servicio"
        />
      </div>

      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
          <div className="absolute -bottom-12 -left-4 w-28 h-28 rounded-full bg-white" />
        </div>
        <div className="relative z-10">
          <Badge className="bg-white/20 text-white border-white/30 mb-3">Más popular</Badge>
          <h2 className="font-[var(--font-display)] text-2xl font-bold mb-1">Aseo de Hogar</h2>
          <p className="text-brand-100 text-sm mb-4">
            Profesionales verificados · Garantía de calidad
          </p>
          <Button
            asChild
            className="bg-white text-brand-600 hover:bg-brand-50 font-semibold"
          >
            <Link to="/app/reservar">Agendar ahora</Link>
          </Button>
        </div>
      </div>

      {/* Services grid */}
      <section>
        <h2 className="font-semibold text-ink mb-4">Nuestros servicios</h2>
        {servicesLoading ? (
          <LoadingState rows={4} />
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
          >
            {services?.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelect={handleSelectService}
              />
            ))}
          </div>
        )}
      </section>

      {/* Two-column row: Próximo + Pendiente */}
      {bookingsLoading ? (
        <LoadingState rows={2} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Próximo servicio */}
          <section className="space-y-3">
            <h2 className="font-semibold text-ink">Próximo servicio</h2>
            {nextBooking ? (
              <BookingCard booking={nextBooking} />
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-surface p-5 text-center">
                <p className="text-sm text-muted">Sin servicios próximos</p>
                <Button asChild size="sm" className="mt-3 bg-brand-600 hover:bg-brand-700 text-white">
                  <Link to="/app/reservar">Agendar ahora</Link>
                </Button>
              </div>
            )}
          </section>

          {/* Pendiente por calificar */}
          <section className="space-y-3">
            <h2 className="font-semibold text-ink">Pendiente por calificar</h2>
            {pendingRating ? (
              <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                <div>
                  <p className="font-medium text-ink text-sm">
                    {pendingRating.serviceType === "hogar" ? "Aseo de Hogar" :
                     pendingRating.serviceType === "profundo" ? "Aseo Profundo" :
                     pendingRating.serviceType === "plomeria" ? "Plomería Express" :
                     "Electricista"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {fechaCorta(pendingRating.date)} · {pendingRating.duration}h
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full group border-brand-200 text-brand-600 hover:bg-brand-50">
                  <Link to="/app/servicios/$id/calificar" params={{ id: pendingRating.id }}>
                    Calificar servicio
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-surface p-5 text-center">
                <p className="text-sm text-muted">Sin servicios por calificar</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
