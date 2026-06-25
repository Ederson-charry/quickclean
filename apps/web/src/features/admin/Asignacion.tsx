import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Sparkles,
  Star,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import {
  type BoardBooking,
  useAssign,
  useAssignmentBoard,
  useCandidates,
} from "@/hooks/catalog";
import { fechaHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

// ─── Diálogo de candidatos ────────────────────────────────────────────────────
function AssignDialog({ booking, onClose }: { booking: BoardBooking | null; onClose: () => void }) {
  const { data: candidates, isLoading, isError, refetch } = useCandidates(booking?.id ?? null, !!booking);
  const assign = useAssign();
  const [reason, setReason] = useState("");

  const doAssign = (quickerId: string, name: string) => {
    if (!booking) return;
    assign.mutate(
      { bookingId: booking.id, quickerId, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Asignado a ${name}`);
          setReason("");
          onClose();
        },
        onError: () => toast.error("No se pudo asignar"),
      },
    );
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Asignar quicker</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-ink-2">
              {booking.category?.name} · {fechaHora(booking.scheduledAt)} · {booking.address}
            </p>

            <div className="mt-3 space-y-1.5">
              <Label htmlFor="reason" className="text-xs text-ink-2">
                Motivo (opcional)
              </Label>
              <Input
                id="reason"
                placeholder="p. ej. reasignación por incapacidad"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-2">
              Candidatos sugeridos
            </h3>

            {isLoading ? (
              <LoadingState rows={3} />
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : !candidates || candidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-faint">No hay quickers disponibles.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {candidates.map((c, i) => {
                  const usable = c.eligible && c.available;
                  return (
                  <li
                    key={c.quickerId}
                    className={cn(
                      "rounded-lg border p-3",
                      !usable
                        ? "border-line bg-bg/40 opacity-70"
                        : i === 0
                        ? "border-brand-300 bg-brand-50/40"
                        : "border-line",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">{c.name}</span>
                          {usable && i === 0 && (
                            <Badge className="bg-brand-100 text-brand-700">Sugerido</Badge>
                          )}
                          {!c.eligible && (
                            <Badge className="bg-danger/10 text-danger">
                              No elegible{c.eligibilityReason ? ` · ${c.eligibilityReason}` : ""}
                            </Badge>
                          )}
                          {c.eligible && !c.available && (
                            <Badge className="bg-warning/10 text-warning">
                              No disponible{c.unavailableReason ? ` · ${c.unavailableReason}` : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" /> {c.zone}
                            {c.zoneMatch && <CheckCircle2 className="size-3 text-success" />}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="size-3 text-amber-500" /> {c.rating}
                          </span>
                          <span>Carga: {c.load}</span>
                          {c.hasSkill ? (
                            <span className="inline-flex items-center gap-1 text-success">
                              <Sparkles className="size-3" /> habilitado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-faint">
                              <AlertCircle className="size-3" /> sin skill
                            </span>
                          )}
                          {c.clash && <span className="text-danger">choque de agenda</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="font-mono text-xs tabular-nums text-faint">{c.score}</span>
                        <Button
                          size="sm"
                          variant={usable && i === 0 ? "default" : "outline"}
                          className={usable && i === 0 ? "bg-brand-600 text-white hover:bg-brand-700" : ""}
                          onClick={() => doAssign(c.quickerId, c.name)}
                          disabled={assign.isPending || !usable}
                        >
                          {!c.eligible ? "Bloqueado" : !c.available ? "No disponible" : i === 0 ? "Confirmar" : "Asignar"}
                        </Button>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Tarjeta del tablero ──────────────────────────────────────────────────────
function BoardCard({ b, onAssign }: { b: BoardBooking; onAssign: () => void }) {
  const assigned = b.assignment?.quicker;
  return (
    <li
      className={cn(
        "rounded-xl border bg-surface p-4 shadow-sm",
        assigned ? "border-line" : "border-amber-400/50 ring-1 ring-amber-400/20",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-ink">{b.category?.name ?? "—"}</span>
        <Badge className={b.status === "en_curso" ? "bg-warning/10 text-warning" : "bg-brand-100 text-brand-700"}>
          {b.status === "en_curso" ? "En curso" : "Agendado"}
        </Badge>
      </div>
      <p className="mt-1 font-mono text-xs tabular-nums text-faint">{fechaHora(b.scheduledAt)}</p>
      <p className="mt-0.5 truncate text-xs text-ink-2">
        {b.client?.email} · {b.address}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        {assigned ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-ink">
            <UserCheck className="size-4 text-success" />
            {assigned.name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
            <AlertCircle className="size-4" />
            Sin asignar
          </span>
        )}
        <Button
          size="sm"
          variant={assigned ? "outline" : "default"}
          className={assigned ? "" : "bg-brand-600 text-white hover:bg-brand-700"}
          onClick={onAssign}
        >
          {assigned ? "Reasignar" : "Asignar"}
        </Button>
      </div>
    </li>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Asignacion() {
  const enabled = !!useSession((s) => s.accessToken);
  const { data, isLoading, isError, refetch } = useAssignmentBoard(enabled);
  const [selected, setSelected] = useState<BoardBooking | null>(null);

  const items = data ?? [];
  const pending = items.filter((b) => !b.assignment).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Asignación</h1>
        <p className="mt-1 text-sm text-ink-2">
          Torre de control — asigna el quicker idóneo a cada servicio.
          {pending > 0 && <span className="ml-1 font-medium text-amber-600">{pending} sin asignar.</span>}
        </p>
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (assignment.manage)." />
        </div>
      ) : isLoading ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Sin servicios activos" hint="No hay reservas agendadas o en curso." />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <BoardCard key={b.id} b={b} onAssign={() => setSelected(b)} />
          ))}
        </ul>
      )}

      <AssignDialog booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
