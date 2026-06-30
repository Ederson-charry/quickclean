import { Link } from "@tanstack/react-router";
import {
  Bath,
  Brush,
  Building2,
  CalendarDays,
  ChevronRight,
  HardHat,
  type LucideIcon,
  MapPin,
  Sofa,
  Sparkles,
  Wind,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/States";
import { type ClientBooking, useMyReservations, useServiceCategories } from "@/hooks/catalog";
import { useSession } from "@/stores/session";
import { cop, fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { Sparkles, Wind, HardHat, Sofa, Bath, Brush, Building2 };

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  agendado: { label: "Agendado", className: "bg-brand-100 text-brand-700" },
  en_curso: { label: "En curso", className: "bg-warning/10 text-warning" },
};

function NextServiceCard({ b }: { b: ClientBooking }) {
  const badge = STATUS_BADGE[b.status] ?? STATUS_BADGE.agendado;
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-ink">{b.category?.name ?? "Servicio"}</span>
        <Badge className={badge.className}>{badge.label}</Badge>
      </div>
      <div className="mt-2 space-y-1 text-sm text-ink-2">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-faint" />
          <span className="capitalize">{fechaCorta(b.scheduledAt)} · {b.duration}h</span>
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-faint" />
          <span className="truncate">{b.address}</span>
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm font-semibold text-brand-600">{cop(b.priceTotal)}</span>
        <Link to="/app/servicios" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          Ver detalle <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const userName = useSession((s) => s.user?.name);
  const cats = useServiceCategories();
  const bookings = useMyReservations(true);

  const next = bookings.data
    ?.filter((b) => b.status === "agendado" || b.status === "en_curso")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-md">
        <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
        <p className="text-sm font-medium text-white/80">Hola{userName ? `, ${userName.split(" ")[0]}` : ""} 👋</p>
        <h1 className="mt-1 font-display text-2xl font-bold leading-tight">Tu hogar impecable, a un clic</h1>
        <Link
          to="/app/reservar"
          className={cn(buttonVariants(), "mt-4 bg-white font-semibold !text-brand-700 hover:bg-white/90")}
        >
          Agendar servicio
        </Link>
      </div>

      {/* Catálogo real */}
      <section>
        <h2 className="mb-3 font-semibold text-ink">Nuestros servicios</h2>
        {cats.isLoading ? (
          <LoadingState rows={2} />
        ) : cats.isError ? (
          <ErrorState onRetry={() => cats.refetch()} />
        ) : !cats.data || cats.data.length === 0 ? (
          <EmptyState title="Sin servicios disponibles" hint="Pronto ampliaremos el catálogo." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cats.data.map((c) => {
              const Icon = ICONS[c.iconName] ?? Sparkles;
              return (
                <Link
                  key={c.id}
                  to="/app/reservar"
                  className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition-all hover:border-brand-300 hover:shadow-sm"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                    <Icon className="size-5 text-brand-600" />
                  </div>
                  <span className="text-sm font-medium text-ink">{c.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Próximo servicio (real) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Próximo servicio</h2>
          <Link to="/app/servicios" className="text-sm text-brand-600 hover:underline">Ver todos</Link>
        </div>
        {bookings.isLoading ? (
          <LoadingState rows={1} />
        ) : bookings.isError ? (
          <ErrorState onRetry={() => bookings.refetch()} />
        ) : next ? (
          <NextServiceCard b={next} />
        ) : (
          <EmptyState title="Sin servicios próximos" hint="Agenda tu primer servicio cuando quieras." />
        )}
      </section>
    </div>
  );
}
