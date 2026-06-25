import { Bell, KeyRound, Mail, PartyPopper } from "lucide-react";
import { type NotificationDTO, useNotifications } from "@/hooks/catalog";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { fechaHora } from "@/lib/format";
import { useSession } from "@/stores/session";

const KIND_META: Record<string, { label: string; icon: typeof Mail; className: string }> = {
  welcome: { label: "Bienvenida", icon: PartyPopper, className: "bg-brand-100 text-brand-700" },
  password_reset: { label: "Restablecer contraseña", icon: KeyRound, className: "bg-amber-100 text-amber-700" },
  booking_confirmed: { label: "Reserva confirmada", icon: Bell, className: "bg-success/10 text-success" },
};

function Row({ n }: { n: NotificationDTO }) {
  const meta = KIND_META[n.kind] ?? { label: n.kind, icon: Mail, className: "bg-muted text-ink-2" };
  const Icon = meta.icon;
  return (
    <li className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={meta.className}>
              <Icon className="mr-1 inline size-3" /> {meta.label}
            </Badge>
            <span className="truncate text-sm font-medium text-ink">{n.subject}</span>
          </div>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-faint">
            <Mail className="size-3" /> {n.to} · {n.channel}
          </p>
          <p className="mt-2 whitespace-pre-line text-xs text-ink-2">{n.body}</p>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-faint">{fechaHora(n.createdAt)}</span>
      </div>
    </li>
  );
}

export default function Notificaciones() {
  const enabled = !!useSession((s) => s.accessToken);
  const notifs = useNotifications(enabled);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Notificaciones</h1>
        <p className="mt-1 text-sm text-ink-2">
          Bandeja de salida (bienvenidas, restablecimientos, confirmaciones). El transporte real (SMTP/SMS) se conecta
          por entorno.
        </p>
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (audit.read)." />
        </div>
      ) : notifs.isLoading ? (
        <LoadingState rows={4} />
      ) : notifs.isError ? (
        <ErrorState onRetry={() => notifs.refetch()} />
      ) : !notifs.data || notifs.data.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Sin notificaciones" hint="Aún no se ha enviado ningún mensaje." />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {notifs.data.map((n) => (
            <Row key={n.id} n={n} />
          ))}
        </ul>
      )}
    </div>
  );
}
