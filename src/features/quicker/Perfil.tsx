import { useNavigate } from "@tanstack/react-router";
import {
  User, Mail, Phone, MapPin, FileText, Star, LogOut,
  Briefcase, Shield, Award,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/stores/session";
import { RatingStars } from "@/components/shared/RatingStars";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Carolina Méndez data (the active quicker)
const QUICKER_DATA = {
  id: "q2",
  name: "Carolina Méndez",
  doc: "1.020.345.678",
  phone: "+57 300 123 4567",
  email: "carolina@quickclean.co",
  zone: "Chapinero, Bogotá",
  contract: "Contrato fijo",
  rating: 4.9,
  monthlyServices: 42,
};

const DOCUMENTS = [
  { label: "Cédula de ciudadanía", status: "Verificado" },
  { label: "Antecedentes judiciales", status: "Verificado" },
  { label: "Certificado de experiencia", status: "Verificado" },
  { label: "Póliza de responsabilidad civil", status: "Vigente" },
];

const INFO_ROWS = [
  { icon: User, label: "Documento", value: QUICKER_DATA.doc },
  { icon: Mail, label: "Correo", value: QUICKER_DATA.email },
  { icon: Phone, label: "Celular", value: QUICKER_DATA.phone },
  { icon: MapPin, label: "Zona", value: QUICKER_DATA.zone },
  { icon: Briefcase, label: "Contrato", value: QUICKER_DATA.contract },
];

export default function Perfil() {
  const navigate = useNavigate();
  const { logout } = useSession();
  const initials = QUICKER_DATA.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  const handleLogout = () => {
    logout();
    toast.info("Sesión cerrada");
    navigate({ to: "/login" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Mi perfil</h1>
        <p className="mt-0.5 text-sm text-muted">Información y documentos</p>
      </div>

      {/* Avatar + identity */}
      <div className="flex items-center gap-5 rounded-2xl border border-line bg-surface p-5">
        <Avatar className="h-18 w-18 shrink-0" style={{ height: 72, width: 72 }}>
          <AvatarFallback className="bg-brand-100 text-brand-700 text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold text-ink">{QUICKER_DATA.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-success/10 text-success text-xs">
              Activo
            </Badge>
            <span className="text-sm text-muted">Quicker QuickClean</span>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-muted uppercase tracking-wide">Calificación</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-display text-3xl font-bold text-ink">{QUICKER_DATA.rating}</span>
              <div className="flex flex-col gap-1">
                <RatingStars value={QUICKER_DATA.rating} readOnly size="sm" />
                <p className="text-xs text-muted">{QUICKER_DATA.monthlyServices} servicios este mes</p>
              </div>
            </div>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50">
            <Award className="h-7 w-7 text-yellow-500" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Puntualidad", stars: 5 },
            { label: "Limpieza", stars: 5 },
            { label: "Amabilidad", stars: 5 },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-bg p-3">
              <p className="text-xs text-muted">{item.label}</p>
              <div className="mt-1 flex justify-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personal info */}
      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <h2 className="font-semibold text-ink">Información personal</h2>
        </div>
        <div className="divide-y divide-line">
          {INFO_ROWS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3">
              <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <span className="text-sm text-muted w-28 shrink-0">{label}</span>
              <span className="text-sm font-medium text-ink truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          <Shield className="h-4 w-4 text-success" />
          <h2 className="font-semibold text-ink">Documentos</h2>
        </div>
        <div className="divide-y divide-line">
          {DOCUMENTS.map((doc) => (
            <div key={doc.label} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="text-sm text-ink">{doc.label}</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-success/10 text-success text-xs"
              >
                {doc.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Logout */}
      <div className="pb-4">
        <Button
          variant="outline"
          className="w-full gap-2 border-danger/30 text-danger hover:bg-danger/5 hover:border-danger/50 h-11 font-semibold"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
