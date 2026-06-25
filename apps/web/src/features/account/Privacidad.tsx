import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Download, FileText, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import {
  downloadMyData,
  useConsentStatus,
  useDataPolicy,
  useDeleteAccount,
  useGiveConsent,
  useRectifyProfile,
  useWithdrawConsent,
} from "@/hooks/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/stores/session";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">{children}</section>;
}

export default function Privacidad() {
  const token = useSession((s) => s.accessToken);
  const logout = useSession((s) => s.logout);
  const navigate = useNavigate();
  const enabled = !!token;

  const policy = useDataPolicy();
  const consent = useConsentStatus(enabled);
  const give = useGiveConsent();
  const withdraw = useWithdrawConsent();
  const rectify = useRectifyProfile();
  const del = useDeleteAccount();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const saveProfile = async () => {
    if (!phone && !name) {
      toast.error("Indica teléfono o nombre para actualizar");
      return;
    }
    try {
      await rectify.mutateAsync({ phone: phone || undefined, name: name || undefined });
      toast.success("Datos actualizados");
      setPhone("");
      setName("");
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const onExport = async () => {
    setDownloading(true);
    try {
      await downloadMyData();
      toast.success("Descarga iniciada");
    } catch {
      toast.error("No se pudo exportar");
    } finally {
      setDownloading(false);
    }
  };

  const onDelete = async () => {
    try {
      await del.mutateAsync();
      toast.success("Cuenta suprimida. Cerrando sesión.");
      logout();
      navigate({ to: "/login" });
    } catch {
      toast.error("No se pudo suprimir la cuenta");
    }
  };

  if (!enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto size-10 text-brand-600" />
        <h1 className="mt-3 font-display text-2xl font-bold text-ink">Privacidad y datos</h1>
        <p className="mt-2 text-sm text-ink-2">Inicia sesión para gestionar tus datos personales.</p>
        <Link to="/login" className="mt-4 inline-block font-semibold text-brand-600 underline underline-offset-2">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Privacidad y datos</h1>
        <p className="mt-1 text-sm text-ink-2">
          Tus derechos como titular (Ley 1581): conocer, actualizar, exportar y suprimir tus datos.
        </p>
      </header>

      {/* Política + consentimiento */}
      <Card>
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <FileText className="size-4 text-brand-600" /> Tratamiento de datos
        </h2>
        {policy.data && (
          <>
            <p className="mt-2 text-sm text-ink-2">{policy.data.summary}</p>
            <ul className="mt-3 space-y-1 text-sm text-ink-2">
              {policy.data.rights.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-brand-600">•</span> {r}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-faint">{policy.data.retentionNote}</p>
          </>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {consent.data?.needsConsent === false ? (
            <>
              <Badge className="bg-success/10 text-success">
                <ShieldCheck className="mr-1 inline size-3" /> Consentimiento otorgado (v{consent.data.acceptedVersion})
              </Badge>
              <Button
                size="sm"
                variant="outline"
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate(undefined, { onSuccess: () => toast.success("Consentimiento retirado") })}
              >
                Retirar
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-ink-2">
                Debes aceptar la política vigente (v{consent.data?.currentVersion}).
              </span>
              <Button
                size="sm"
                className="bg-brand-600 text-white hover:bg-brand-700"
                disabled={give.isPending}
                onClick={() => give.mutate(undefined, { onSuccess: () => toast.success("Consentimiento otorgado") })}
              >
                Aceptar
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Rectificación */}
      <Card>
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <UserCog className="size-4 text-brand-600" /> Actualizar mis datos
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pv-name">Nombre</Label>
            <Input id="pv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo nombre" className="border-line" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-phone">Teléfono</Label>
            <Input id="pv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" className="border-line" />
          </div>
        </div>
        <Button size="sm" className="mt-3" disabled={rectify.isPending} onClick={saveProfile}>
          Guardar cambios
        </Button>
      </Card>

      {/* Exportación */}
      <Card>
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Download className="size-4 text-brand-600" /> Exportar mis datos
        </h2>
        <p className="mt-2 text-sm text-ink-2">Descarga una copia de tus datos personales en formato JSON.</p>
        <Button size="sm" variant="outline" className="mt-3" disabled={downloading} onClick={onExport}>
          {downloading ? "Preparando..." : "Descargar JSON"}
        </Button>
      </Card>

      {/* Supresión */}
      <Card>
        <h2 className="flex items-center gap-2 font-semibold text-danger">
          <AlertTriangle className="size-4" /> Suprimir mi cuenta
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          Tus datos personales se anonimizan y se desactiva tu acceso. Por obligaciones legales (reservas, pagos,
          nómina) algunos registros se conservan anonimizados. Esta acción no se puede deshacer.
        </p>
        {confirmDelete ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-danger">¿Confirmas la supresión?</span>
            <Button size="sm" variant="outline" className="border-danger/40 text-danger hover:bg-danger/5" disabled={del.isPending} onClick={onDelete}>
              Sí, suprimir
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="mt-3 border-danger/40 text-danger hover:bg-danger/5" onClick={() => setConfirmDelete(true)}>
            Suprimir cuenta
          </Button>
        )}
      </Card>
    </div>
  );
}
