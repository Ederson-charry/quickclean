import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, FileText, KeyRound, Phone, ShieldCheck, UserPlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  type AdminClient,
  type DocType,
  useAdminClients,
  useCreateClient,
  useResetClientPassword,
  useUpdateClient,
} from "@/hooks/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "cc", label: "Cédula" },
  { value: "nit", label: "NIT" },
  { value: "ce", label: "C. Extranjería" },
  { value: "pasaporte", label: "Pasaporte" },
];
const DOC_LABEL: Record<DocType, string> = { cc: "CC", nit: "NIT", ce: "CE", pasaporte: "Pasaporte" };

const schema = z.object({
  email: z.string().email("Correo inválido"),
  name: z.string().min(2, "Nombre requerido"),
  kind: z.enum(["persona", "empresa"]),
  docType: z.enum(["cc", "nit", "ce", "pasaporte"]).optional(),
  docNumber: z.string().optional(),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function TempPasswordBanner({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  return (
    <div className="rounded-xl border border-success/40 bg-success/5 p-4">
      <div className="flex items-center gap-2 text-success">
        <KeyRound className="size-4" />
        <span className="font-semibold">Cuenta creada</span>
      </div>
      <p className="mt-2 text-sm text-ink-2">
        Entrega esta contraseña temporal a <span className="font-medium text-ink">{email}</span>. Se muestra una sola
        vez; al primer ingreso deberá cambiarla.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="select-all rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm font-bold text-ink">
          {password}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            navigator.clipboard?.writeText(password).then(
              () => toast.success("Copiada"),
              () => toast.error("No se pudo copiar"),
            )
          }
        >
          Copiar
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Listo</Button>
      </div>
    </div>
  );
}

function NewClientForm({ onCreated }: { onCreated: (email: string, pw: string) => void }) {
  const create = useCreateClient();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { kind: "persona" },
  });
  const kind = watch("kind");
  const docType = watch("docType");

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await create.mutateAsync({
        email: data.email,
        name: data.name,
        kind: data.kind,
        docType: data.docType,
        docNumber: data.docNumber || undefined,
        phone: data.phone || undefined,
      });
      onCreated(data.email, res.tempPassword);
      reset({ kind: "persona" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el cliente");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
        <UserPlus className="size-4 text-brand-600" /> Nuevo cliente
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de cliente">
        {(["persona", "empresa"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setValue("kind", k, { shouldValidate: true })}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all",
              kind === k ? "border-brand-600 bg-brand-50" : "border-line bg-surface hover:border-brand-300",
            )}
          >
            {k === "empresa" ? <Building2 className="size-4 text-brand-600" /> : <UserRound className="size-4 text-brand-600" />}
            <span className={cn("text-sm font-semibold", kind === k ? "text-brand-700" : "text-ink")}>
              {k === "empresa" ? "Empresa" : "Persona"}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">{kind === "empresa" ? "Razón social" : "Nombre"}</Label>
          <Input id="c-name" {...register("name")} className={cn("border-line", errors.name && "border-danger")} placeholder={kind === "empresa" ? "Oficinas Andinas SAS" : "Laura Gómez"} />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-email">Correo</Label>
          <Input id="c-email" type="email" {...register("email")} className={cn("border-line", errors.email && "border-danger")} placeholder="cliente@correo.com" />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Tipo de documento</Label>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setValue("docType", docType === d.value ? undefined : d.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  docType === d.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-2 hover:border-brand-300",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-docnum">Número de documento</Label>
          <Input id="c-docnum" {...register("docNumber")} className="border-line" placeholder="1020304050" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-phone">Teléfono</Label>
          <Input id="c-phone" {...register("phone")} className="border-line" placeholder="300 123 4567" />
        </div>
      </div>

      {kind === "empresa" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-2">
          <ShieldCheck className="size-3.5 text-brand-600" /> Las empresas exigen contratación laboral directa (solidaridad §6).
        </p>
      )}

      <Button type="submit" disabled={create.isPending} className="mt-4 h-11 w-full font-semibold sm:w-auto sm:px-8">
        {create.isPending ? "Creando..." : "Crear cliente"}
      </Button>
    </form>
  );
}

function ClientRow({ c, onTempPassword }: { c: AdminClient; onTempPassword: (email: string, pw: string) => void }) {
  const update = useUpdateClient();
  const resetPw = useResetClientPassword();
  const empresa = c.kind === "empresa";
  const activo = c.user.status === "active";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [docType, setDocType] = useState<DocType | undefined>(c.docType ?? undefined);
  const [docNumber, setDocNumber] = useState(c.docNumber ?? "");
  const [phone, setPhone] = useState(c.user.phone ?? "");

  const patch = (data: Parameters<typeof update.mutate>[0], ok = "Actualizado") =>
    update.mutate(data, { onSuccess: () => toast.success(ok), onError: () => toast.error("No se pudo actualizar") });

  const save = () =>
    update.mutate(
      { id: c.id, name, docType, docNumber: docNumber || undefined, phone },
      { onSuccess: () => { toast.success("Cliente actualizado"); setEditing(false); }, onError: () => toast.error("No se pudo actualizar") },
    );

  const resetPassword = () =>
    resetPw.mutate(c.id, {
      onSuccess: (res) => onTempPassword(c.user.email, res.tempPassword),
      onError: () => toast.error("No se pudo restablecer"),
    });

  return (
    <li className={cn("rounded-xl border border-line bg-surface p-4 shadow-sm", !activo && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 truncate font-semibold text-ink">
              {empresa ? <Building2 className="size-4 text-faint" /> : <UserRound className="size-4 text-faint" />}
              {c.name}
            </span>
            <Badge className={empresa ? "bg-brand-100 text-brand-700" : "bg-muted text-ink-2"}>
              {empresa ? "Empresa" : "Persona"}
            </Badge>
            <Badge className={activo ? "bg-success/10 text-success" : "bg-muted text-faint"}>
              {activo ? "Activo" : "Inactivo"}
            </Badge>
            {c.requiresDirectHire && <Badge className="bg-amber-100 text-amber-700">Contratación directa</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
            <span className="truncate text-faint">{c.user.email}</span>
            {c.docType && <span className="inline-flex items-center gap-1"><FileText className="size-3" /> {DOC_LABEL[c.docType]} {c.docNumber}</span>}
            {c.user.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" /> {c.user.phone}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={activo}
            onCheckedChange={(v) => patch({ id: c.id, active: v }, v ? "Activado" : "Desactivado")}
            aria-label="Activo"
          />
          <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cerrar" : "Editar"}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${c.id}`}>{empresa ? "Razón social" : "Nombre"}</Label>
              <Input id={`name-${c.id}`} value={name} onChange={(e) => setName(e.target.value)} className="border-line" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`phone-${c.id}`}>Teléfono</Label>
              <Input id={`phone-${c.id}`} value={phone} onChange={(e) => setPhone(e.target.value)} className="border-line" placeholder="300 123 4567" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Tipo de documento</Label>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDocType((cur) => (cur === d.value ? undefined : d.value))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    docType === d.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-2 hover:border-brand-300",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`doc-${c.id}`}>Número de documento</Label>
            <Input id={`doc-${c.id}`} value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className="border-line" />
          </div>
          {empresa && (
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <Switch
                checked={c.requiresDirectHire}
                onCheckedChange={(v) => patch({ id: c.id, requiresDirectHire: v })}
                aria-label="Contratación directa"
              />
              Exige contratación laboral directa
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={update.isPending} className="bg-brand-600 text-white hover:bg-brand-700" onClick={save}>
              Guardar cambios
            </Button>
            <Button size="sm" variant="outline" disabled={resetPw.isPending} onClick={resetPassword}>
              <KeyRound className="size-4" /> Restablecer contraseña
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Clientes() {
  const enabled = !!useSession((s) => s.accessToken);
  const clients = useAdminClients(enabled);
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<{ email: string; pw: string } | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight text-ink">Clientes</h1>
          <p className="mt-1 text-sm text-ink-2">Alta y gestión de clientes (persona o empresa).</p>
        </div>
        {enabled && (
          <Button
            variant={showForm ? "outline" : "default"}
            className={showForm ? "" : "bg-brand-600 text-white hover:bg-brand-700"}
            onClick={() => { setShowForm((v) => !v); setCreated(null); }}
          >
            {showForm ? "Cerrar" : "Nuevo cliente"}
          </Button>
        )}
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (user.manage)." />
        </div>
      ) : (
        <>
          {created && <TempPasswordBanner email={created.email} password={created.pw} onClose={() => setCreated(null)} />}
          {showForm && <NewClientForm onCreated={(email, pw) => { setCreated({ email, pw }); setShowForm(false); }} />}

          {clients.isLoading ? (
            <LoadingState rows={3} />
          ) : clients.isError ? (
            <ErrorState onRetry={() => clients.refetch()} />
          ) : !clients.data || clients.data.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface">
              <EmptyState title="Sin clientes" hint="Crea el primer cliente con Nuevo cliente." />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3">
              {clients.data.map((c) => (
                <ClientRow key={c.id} c={c} onTempPassword={(email, pw) => setCreated({ email, pw })} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
