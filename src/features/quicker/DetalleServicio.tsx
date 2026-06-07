import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
  Phone, User, Camera, CheckCircle2, MapPin, Clock, Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAssignment, useFinishAssignment } from "@/hooks/queries";
import { MapView } from "@/components/shared/MapView";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cop } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  proximo: "Próximo",
  en_curso: "En curso",
  completado: "Completado",
};

const STATUS_CLASS: Record<string, string> = {
  proximo: "border-brand-300 text-brand-600",
  en_curso: "bg-success text-white",
  completado: "bg-line text-ink-2",
};

export default function DetalleServicio() {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const navigate = useNavigate();
  const { data: assignment, isLoading, isError, refetch } = useAssignment(id);
  const finish = useFinishAssignment();
  const [done, setDone] = useState(false);

  const handleFinish = async () => {
    try {
      await finish.mutateAsync(id);
      setDone(true);
      toast.success("¡Servicio finalizado!", {
        description: `${cop(assignment?.payout ?? 0)} añadidos a tu balance.`,
      });
      setTimeout(() => navigate({ to: "/pro" }), 1800);
    } catch {
      toast.error("No se pudo finalizar el servicio. Intenta de nuevo.");
    }
  };

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!assignment) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <p className="text-muted">Servicio no encontrado.</p>
      </div>
    );
  }

  const isCompleted = assignment.status === "completado" || done;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Detalle del servicio</h1>
          <p className="mt-0.5 text-sm text-muted">{assignment.time} · {assignment.durationHours}h</p>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-xs", STATUS_CLASS[assignment.status])}
        >
          {STATUS_LABEL[assignment.status]}
        </Badge>
      </div>

      {/* Map */}
      <MapView
        minutes={Math.round(8 + Math.random() * 5)}
        km={parseFloat((1 + Math.random() * 2).toFixed(1))}
        address={assignment.address}
      />

      {/* Client info */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-2 uppercase tracking-wide">
          Cliente
        </h2>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-brand-100 text-brand-700 font-semibold">
              {assignment.clientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{assignment.clientName}</p>
            <div className="mt-0.5 flex items-center gap-1 text-sm text-ink-2">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span>4.8 · Cliente frecuente</span>
            </div>
          </div>
          <a
            href="tel:+573001234567"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            aria-label={`Llamar a ${assignment.clientName}`}
          >
            <Phone className="h-5 w-5" />
          </a>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-bg p-3 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <span className="text-ink-2">{assignment.address}</span>
        </div>
      </div>

      {/* Service breakdown + payout */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-2 uppercase tracking-wide">
          Resumen del servicio
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-ink-2">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted" />
              Duración
            </span>
            <span className="font-medium">{assignment.durationHours} horas</span>
          </div>
          <div className="flex justify-between text-ink-2">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted" />
              Cliente
            </span>
            <span className="font-medium">{assignment.clientName}</span>
          </div>
          <div className="h-px bg-line" />
          <div className="flex justify-between">
            <span className="font-semibold text-ink">Tu pago</span>
            <span className="text-lg font-bold text-success">{cop(assignment.payout)}</span>
          </div>
        </div>
      </div>

      {/* Photo reminder */}
      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
        <Camera className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="text-sm">
          <p className="font-semibold text-ink">Recordatorio</p>
          <p className="mt-0.5 text-ink-2">
            Toma una foto antes de comenzar el servicio y otra al finalizar para
            registrar el estado del espacio.
          </p>
        </div>
      </div>

      {/* Finish button */}
      {!isCompleted ? (
        <Button
          className={cn(
            "w-full h-12 text-base font-semibold bg-success text-white",
            "hover:bg-success/90 focus-visible:ring-success/40",
            "transition-all",
          )}
          onClick={handleFinish}
          disabled={finish.isPending}
          aria-label="Finalizar servicio"
        >
          {finish.isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Finalizando...
            </span>
          ) : (
            "Finalizar servicio"
          )}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 p-4 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Servicio completado</span>
        </div>
      )}
    </div>
  );
}
