import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useBooking as useBookingQuery } from "@/hooks/queries";
import { useRateBooking } from "@/hooks/queries";
import { RatingStars } from "@/components/shared/RatingStars";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { cop } from "@/lib/format";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/mocks/db";
import { cn } from "@/lib/utils";

const ASPECT_CHIPS = [
  "Puntualidad",
  "Limpieza",
  "Amabilidad",
  "Comunicación",
  "Cuidado del hogar",
  "Eficiencia",
];

const TIP_OPTIONS = [
  { label: "Sin propina", value: 0 },
  { label: cop(5000), value: 5000 },
  { label: cop(10000), value: 10000 },
  { label: cop(20000), value: 20000 },
];

export default function Calificar() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const { data: booking, isLoading, isError, refetch } = useBookingQuery(id);
  const rateBooking = useRateBooking();

  const [stars, setStars] = useState(0);
  const [aspects, setAspects] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [tip, setTip] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) return <LoadingState rows={4} />;
  if (isError || !booking) return <ErrorState onRetry={refetch} />;

  // If already rated, show a message
  if (booking.rated) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-12">
        <CheckCircle className="h-16 w-16 text-success mx-auto" />
        <h2 className="font-semibold text-xl text-ink">Ya calificaste este servicio</h2>
        <p className="text-muted text-sm">¡Gracias por tu retroalimentación!</p>
        <Button
          onClick={() => navigate({ to: "/app/servicios" })}
          className="bg-brand-600 hover:bg-brand-700 text-white"
        >
          Ver mis servicios
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10 mx-auto">
          <CheckCircle className="h-12 w-12 text-success" />
        </div>
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink mb-2">
            ¡Gracias por calificar!
          </h1>
          <p className="text-muted">
            Tu retroalimentación ayuda a mejorar la experiencia QuickClean
          </p>
        </div>
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
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }

  // Look up the quicker
  const quicker = db.quickers.find((q) => q.id === booking.quickerId);

  function toggleAspect(aspect: string) {
    setAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect],
    );
  }

  async function handleSubmit() {
    if (stars === 0) {
      toast.error("Selecciona una calificación antes de enviar");
      return;
    }

    try {
      await rateBooking.mutateAsync({
        bookingId: booking!.id,
        stars,
        tags: aspects,
        comment: comment.trim() || undefined,
        tip,
      });
      setSubmitted(true);
      toast.success("¡Calificación enviada!");
    } catch {
      toast.error("Error enviando la calificación. Intenta de nuevo.");
    }
  }

  const SERVICE_LABELS: Record<string, string> = {
    hogar: "Aseo de Hogar",
    profundo: "Aseo Profundo",
    plomeria: "Plomería Express",
    electricista: "Electricista",
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink">
        Calificar servicio
      </h1>

      {/* Quicker info */}
      {quicker && (
        <div className="rounded-xl border border-line bg-surface p-5 flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-brand-100 text-brand-700 text-lg font-semibold">
              {quicker.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-ink">{quicker.name}</p>
            <p className="text-sm text-ink-2">{SERVICE_LABELS[booking.serviceType]}</p>
            <p className="text-sm text-ink-2">{booking.date} · {booking.duration}h</p>
          </div>
        </div>
      )}

      {/* Stars */}
      <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
        <p className="font-medium text-ink">¿Cómo fue tu experiencia?</p>
        <div className="flex flex-col items-center gap-2 py-2">
          <RatingStars
            value={stars}
            onChange={setStars}
            size="lg"
            showLabel
          />
        </div>
      </div>

      {/* Aspect chips */}
      <div className="space-y-3">
        <p className="font-medium text-ink">¿Qué destacas del servicio?</p>
        <div className="flex flex-wrap gap-2">
          {ASPECT_CHIPS.map((aspect) => (
            <button
              key={aspect}
              type="button"
              onClick={() => toggleAspect(aspect)}
              aria-pressed={aspects.includes(aspect)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                aspects.includes(aspect)
                  ? "border-brand-600 bg-brand-50 text-brand-700 font-medium"
                  : "border-line bg-surface text-ink-2 hover:border-brand-300",
              )}
            >
              {aspect}
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <label htmlFor="comment" className="font-medium text-ink block">
          Comentario (opcional)
        </label>
        <Textarea
          id="comment"
          placeholder="Comparte los detalles de tu experiencia..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="border-line resize-none"
          rows={3}
        />
      </div>

      {/* Tip chips */}
      <div className="space-y-3">
        <p className="font-medium text-ink">¿Quieres dejar propina?</p>
        <div className="grid grid-cols-4 gap-2">
          {TIP_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTip(value)}
              aria-pressed={tip === value}
              className={cn(
                "rounded-xl border py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                tip === value
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-line bg-surface text-ink-2 hover:border-brand-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold h-12"
        onClick={handleSubmit}
        disabled={rateBooking.isPending}
        aria-label="Enviar calificación"
      >
        {rateBooking.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar calificación"
        )}
      </Button>

      {/* Tip disclaimer */}
      {tip > 0 && (
        <p className="text-center text-xs text-muted">
          La propina de {cop(tip)} va directo a {quicker?.name ?? "tu Quicker"}
        </p>
      )}
    </div>
  );
}
