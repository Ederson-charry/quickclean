import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Building2, FileSignature, MapPin, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  type ContractDTO,
  type ContractKind,
  type EngagementType,
  useContractOptions,
  useContracts,
  useCreateContract,
  useFinalizeContract,
} from "@/hooks/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cop, fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

const POOL = "__pool__";

const schema = z
  .object({
    quickerId: z.string().uuid("Selecciona un quicker"),
    clientId: z.string(), // POOL o uuid
    engagementType: z.enum(["contractor", "employee"]),
    contractKind: z.enum(["prestacion", "fijo", "indefinido"]),
    position: z.string().trim().max(80).optional(),
    monthlySalary: z.number().int().positive().optional(),
  })
  .refine((d) => (d.engagementType === "contractor" ? d.contractKind === "prestacion" : d.contractKind !== "prestacion"), {
    message: "Contratista ⇒ prestación; empleado ⇒ fijo o indefinido",
    path: ["contractKind"],
  })
  .refine((d) => d.engagementType !== "employee" || (d.monthlySalary ?? 0) > 0, {
    message: "El empleado requiere salario base mensual",
    path: ["monthlySalary"],
  });
type FormValues = z.infer<typeof schema>;

const KIND_BY_ENGAGEMENT: Record<EngagementType, { value: ContractKind; label: string }[]> = {
  contractor: [{ value: "prestacion", label: "Prestación de servicios" }],
  employee: [
    { value: "indefinido", label: "Término indefinido" },
    { value: "fijo", label: "Término fijo" },
  ],
};

const ENGAGEMENT_LABEL: Record<EngagementType, string> = {
  contractor: "Contratista",
  employee: "Empleado",
};
const KIND_LABEL: Record<ContractKind, string> = {
  prestacion: "Prestación",
  fijo: "Término fijo",
  indefinido: "Indefinido",
};

function NewContractForm() {
  const opts = useContractOptions(true);
  const create = useCreateContract();

  const { handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quickerId: "", clientId: POOL, engagementType: "contractor", contractKind: "prestacion", position: "" },
  });

  const quickerId = watch("quickerId");
  const clientId = watch("clientId");
  const engagementType = watch("engagementType");
  const contractKind = watch("contractKind");

  const quickers = opts.data?.quickers ?? [];
  const clients = opts.data?.clients ?? [];

  const onEngagementChange = (v: EngagementType) => {
    setValue("engagementType", v, { shouldValidate: true });
    // ajusta el tipo de contrato al cambiar la vinculación
    setValue("contractKind", KIND_BY_ENGAGEMENT[v][0].value, { shouldValidate: true });
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await create.mutateAsync({
        quickerId: data.quickerId,
        clientId: data.clientId === POOL ? undefined : data.clientId,
        engagementType: data.engagementType,
        contractKind: data.contractKind,
        position: data.position || undefined,
        monthlySalary: data.engagementType === "employee" ? data.monthlySalary : undefined,
      });
      toast.success("Contrato creado");
      reset({ quickerId: "", clientId: POOL, engagementType: "contractor", contractKind: "prestacion", position: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el contrato");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5"
    >
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
        <FileSignature className="size-4 text-brand-600" /> Nuevo contrato
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Quicker */}
        <div className="space-y-1.5">
          <Label htmlFor="ct-quicker">Quicker</Label>
          <Select value={quickerId} onValueChange={(v) => v && setValue("quickerId", v, { shouldValidate: true })}>
            <SelectTrigger id="ct-quicker" className={cn("w-full border-line", errors.quickerId && "border-danger")}>
              <SelectValue placeholder="Selecciona un quicker">
                {(v) => quickers.find((q) => q.id === v)?.name ?? "Selecciona un quicker"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {quickers.map((q) => (
                <SelectItem key={q.id} value={q.id}>{q.name} · {q.zone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.quickerId && <p className="text-xs text-danger">{errors.quickerId.message}</p>}
        </div>

        {/* Cliente / empresa */}
        <div className="space-y-1.5">
          <Label htmlFor="ct-client">Cliente / empresa</Label>
          <Select value={clientId} onValueChange={(v) => v && setValue("clientId", v, { shouldValidate: true })}>
            <SelectTrigger id="ct-client" className="w-full border-line">
              <SelectValue>
                {(v) => (v === POOL ? "Pool (QuickClean)" : clients.find((c) => c.id === v)?.name ?? "")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={POOL}>Pool (QuickClean)</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.kind === "empresa" ? " · empresa" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Vinculación */}
        <div className="space-y-1.5">
          <Label htmlFor="ct-engagement">Vinculación</Label>
          <Select value={engagementType} onValueChange={(v) => v && onEngagementChange(v as EngagementType)}>
            <SelectTrigger id="ct-engagement" className="w-full border-line">
              <SelectValue>
                {(v) => (v === "employee" ? "Empleado (laboral)" : "Contratista (prestación)")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contractor">Contratista (prestación)</SelectItem>
              <SelectItem value="employee">Empleado (laboral)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de contrato */}
        <div className="space-y-1.5">
          <Label htmlFor="ct-kind">Tipo de contrato</Label>
          <Select
            value={contractKind}
            onValueChange={(v) => v && setValue("contractKind", v as ContractKind, { shouldValidate: true })}
            disabled={engagementType === "contractor"}
          >
            <SelectTrigger id="ct-kind" className={cn("w-full border-line", errors.contractKind && "border-danger")}>
              <SelectValue>{(v) => KIND_LABEL[v as ContractKind]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {KIND_BY_ENGAGEMENT[engagementType].map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.contractKind && <p className="text-xs text-danger">{errors.contractKind.message}</p>}
        </div>

        {/* Cargo */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ct-position">Cargo (opcional)</Label>
          <Input
            id="ct-position"
            placeholder="Ej. Operaria de aseo"
            className="border-line"
            onChange={(e) => setValue("position", e.target.value)}
          />
        </div>

        {/* Salario base — solo empleados */}
        {engagementType === "employee" && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ct-salary">Salario base mensual (COP)</Label>
            <Input
              id="ct-salary"
              type="number"
              min={0}
              placeholder="Ej. 1800000"
              className={cn("border-line", errors.monthlySalary && "border-danger")}
              onChange={(e) => setValue("monthlySalary", e.target.value ? Number(e.target.value) : undefined, { shouldValidate: true })}
            />
            {errors.monthlySalary && <p className="text-xs text-danger">{errors.monthlySalary.message}</p>}
          </div>
        )}
      </div>

      <Button type="submit" disabled={create.isPending} className="mt-4 h-11 w-full font-semibold sm:w-auto sm:px-8">
        {create.isPending ? "Creando..." : "Crear contrato"}
      </Button>
    </form>
  );
}

function ContractRow({ c }: { c: ContractDTO }) {
  const finalize = useFinalizeContract();
  const active = c.status === "activo";
  return (
    <li className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <UserRound className="size-4 text-faint" /> {c.quicker.name}
            </span>
            <Badge
              className={c.engagementType === "employee" ? "bg-brand-100 text-brand-700" : "bg-muted text-ink-2"}
            >
              {ENGAGEMENT_LABEL[c.engagementType]}
            </Badge>
            <Badge className={active ? "bg-success/10 text-success" : "bg-muted text-faint"}>
              {active ? "Activo" : "Finalizado"}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" /> {c.client ? c.client.name : "Pool (QuickClean)"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Briefcase className="size-3" /> {KIND_LABEL[c.contractKind]}
            </span>
            {c.position && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {c.position}
              </span>
            )}
            {c.monthlySalary != null && (
              <span className="inline-flex items-center gap-1 font-medium text-ink-2">
                {cop(c.monthlySalary)}/mes
              </span>
            )}
            <span className="text-faint">
              Desde {fechaCorta(c.startDate)}
              {c.endDate ? ` · hasta ${fechaCorta(c.endDate)}` : ""}
            </span>
          </div>
        </div>
        {active && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-danger/40 text-danger hover:bg-danger/5"
            disabled={finalize.isPending}
            onClick={() =>
              finalize.mutate(c.id, {
                onSuccess: () => toast.success("Contrato finalizado"),
                onError: () => toast.error("No se pudo finalizar"),
              })
            }
          >
            Finalizar
          </Button>
        )}
      </div>
    </li>
  );
}

export default function Contratos() {
  const enabled = !!useSession((s) => s.accessToken);
  const contracts = useContracts(enabled);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight text-ink">Contratos</h1>
          <p className="mt-1 text-sm text-ink-2">
            Vinculación laboral de los quickers (prestación, término fijo/indefinido) y su empresa.
          </p>
        </div>
        {enabled && (
          <Button
            variant={showForm ? "outline" : "default"}
            className={showForm ? "" : "bg-brand-600 text-white hover:bg-brand-700"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cerrar" : "Nuevo contrato"}
          </Button>
        )}
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (contract.manage)." />
        </div>
      ) : (
        <>
          {showForm && <NewContractForm />}

          {contracts.isLoading ? (
            <LoadingState rows={3} />
          ) : contracts.isError ? (
            <ErrorState onRetry={() => contracts.refetch()} />
          ) : !contracts.data || contracts.data.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface">
              <EmptyState title="Sin contratos" hint="Aún no se ha registrado ninguna vinculación." />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3">
              {contracts.data.map((c) => (
                <ContractRow key={c.id} c={c} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
