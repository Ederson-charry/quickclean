import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, KeyRound, ShieldCheck, UserPlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  type AdminClient,
  useAdminClients,
  useCreateClient,
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

const schema = z.object({
  email: z.string().email("Correo inválido"),
  name: z.string().min(2, "Nombre requerido"),
  kind: z.enum(["persona", "empresa"]),
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

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await create.mutateAsync({
        email: data.email,
        name: data.name,
        kind: data.kind,
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
          <Label htmlFor="c-phone">Teléfono (opcional)</Label>
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

function ClientRow({ c }: { c: AdminClient }) {
  const update = useUpdateClient();
  const empresa = c.kind === "empresa";
  const toggleDirectHire = () =>
    update.mutate(
      { id: c.id, requiresDirectHire: !c.requiresDirectHire },
      { onSuccess: () => toast.success("Actualizado"), onError: () => toast.error("No se pudo actualizar") },
    );

  return (
    <li className="rounded-xl border border-line bg-surface p-4 shadow-sm">
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
            {c.requiresDirectHire && <Badge className="bg-amber-100 text-amber-700">Contratación directa</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
            <span className="truncate text-faint">{c.user.email}</span>
            {c.user.phone && <span>{c.user.phone}</span>}
          </div>
        </div>
        {empresa && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-ink-2">Directa</span>
            <Switch checked={c.requiresDirectHire} onCheckedChange={toggleDirectHire} aria-label="Contratación directa" />
          </div>
        )}
      </div>
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
                <ClientRow key={c.id} c={c} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
