import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useSubmitLeave } from "@/hooks/queries";
import { FileDrop } from "@/components/shared/FileDrop";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── Incapacidad schema ────────────────────────────────────────────────────────
const incapacidadSchema = z.object({
  tipo: z.string().min(1, "Selecciona el tipo"),
  from: z.string().min(1, "Selecciona la fecha de inicio"),
  to: z.string().min(1, "Selecciona la fecha de fin"),
  observaciones: z.string().optional(),
});
type IncapacidadForm = z.infer<typeof incapacidadSchema>;

// ── Licencia schema ────────────────────────────────────────────────────────────
const licenciaSchema = z.object({
  kind: z.enum(["licencia_remunerada", "licencia_no_remunerada"]),
  motivo: z.string().min(1, "Selecciona el motivo"),
  from: z.string().min(1, "Selecciona la fecha de inicio"),
  to: z.string().min(1, "Selecciona la fecha de fin"),
  comentario: z.string().optional(),
});
type LicenciaForm = z.infer<typeof licenciaSchema>;

// ── Shared date picker ─────────────────────────────────────────────────────────
function DateRangePicker({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  fromError,
  toError,
}: {
  fromValue: string;
  toValue: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  fromError?: string;
  toError?: string;
}) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const fromDate = fromValue ? new Date(fromValue + "T12:00:00") : undefined;
  const toDate = toValue ? new Date(toValue + "T12:00:00") : undefined;
  const days = fromDate && toDate ? differenceInDays(toDate, fromDate) + 1 : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {/* From */}
        <div className="space-y-1.5">
          <Label>Desde</Label>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger
              className={cn(
                "inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors hover:bg-muted",
                fromError ? "border-danger" : "border-line",
                !fromDate && "text-muted",
              )}
              aria-label="Fecha de inicio"
              aria-invalid={!!fromError}
            >
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate">
                {fromDate ? format(fromDate, "d MMM yyyy", { locale: es }) : "Inicio"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(d) => {
                  if (d) { onFromChange(format(d, "yyyy-MM-dd")); setFromOpen(false); }
                }}
                disabled={(d) => d < new Date()}
                locale={es}
              />
            </PopoverContent>
          </Popover>
          {fromError && <p className="text-xs text-danger">{fromError}</p>}
        </div>

        {/* To */}
        <div className="space-y-1.5">
          <Label>Hasta</Label>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger
              className={cn(
                "inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors hover:bg-muted",
                toError ? "border-danger" : "border-line",
                !toDate && "text-muted",
              )}
              aria-label="Fecha de fin"
              aria-invalid={!!toError}
            >
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate">
                {toDate ? format(toDate, "d MMM yyyy", { locale: es }) : "Fin"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(d) => {
                  if (d) { onToChange(format(d, "yyyy-MM-dd")); setToOpen(false); }
                }}
                disabled={(d) => d < (fromDate ? addDays(fromDate, 1) : new Date())}
                locale={es}
              />
            </PopoverContent>
          </Popover>
          {toError && <p className="text-xs text-danger">{toError}</p>}
        </div>
      </div>

      {days !== null && days > 0 && (
        <p className="text-sm text-brand-600 font-medium">
          {days} día{days !== 1 ? "s" : ""} seleccionado{days !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────
function SuccessState({ radicado, onNew }: { radicado: string; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-success/30 bg-success/5 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <div>
        <h3 className="font-semibold text-ink">Solicitud en revisión</h3>
        <p className="mt-1 text-sm text-muted">
          Tu solicitud fue radicada exitosamente.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-surface border border-line px-4 py-2">
          <FileText className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-ink-2">Radicado</span>
          <span className="font-mono text-sm font-bold text-ink">{radicado.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="text-sm text-brand-600 underline underline-offset-2 hover:text-brand-700"
      >
        Nueva solicitud
      </button>
    </div>
  );
}

// ── Incapacidad form ───────────────────────────────────────────────────────────
function IncapacidadForm() {
  const submitLeave = useSubmitLeave();
  const [radicado, setRadicado] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const {
    handleSubmit, setValue, watch, formState: { errors, isSubmitting },
  } = useForm<IncapacidadForm>({
    resolver: zodResolver(incapacidadSchema),
    defaultValues: { tipo: "", from: "", to: "", observaciones: "" },
  });

  const from = watch("from");
  const to = watch("to");
  const tipo = watch("tipo");

  const onSubmit = async (data: IncapacidadForm) => {
    try {
      const result = await submitLeave.mutateAsync({
        quickerId: "q2",
        kind: "incapacidad",
        reason: data.tipo,
        from: data.from,
        to: data.to,
        fileName: fileName || undefined,
      });
      setRadicado(result.id);
      toast.success("Solicitud de incapacidad radicada");
    } catch {
      toast.error("Error al radicar la solicitud. Intenta de nuevo.");
    }
  };

  if (radicado) {
    return <SuccessState radicado={radicado as string} onNew={() => setRadicado(null)} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Tipo */}
      <div className="space-y-1.5">
        <Label htmlFor="inc-tipo">Tipo de incapacidad</Label>
        <Select value={tipo} onValueChange={(v) => v && setValue("tipo", v, { shouldValidate: true })}>
          <SelectTrigger
            id="inc-tipo"
            className={cn("w-full border-line", errors.tipo && "border-danger")}
            aria-invalid={!!errors.tipo}
            aria-describedby={errors.tipo ? "inc-tipo-error" : undefined}
          >
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Enfermedad general">Enfermedad general</SelectItem>
            <SelectItem value="Accidente de trabajo">Accidente de trabajo</SelectItem>
            <SelectItem value="Enfermedad profesional">Enfermedad profesional</SelectItem>
            <SelectItem value="Maternidad / Paternidad">Maternidad / Paternidad</SelectItem>
          </SelectContent>
        </Select>
        {errors.tipo && <p id="inc-tipo-error" className="text-xs text-danger">{errors.tipo.message}</p>}
      </div>

      {/* Fechas */}
      <div className="space-y-1.5">
        <Label>Período de incapacidad</Label>
        <DateRangePicker
          fromValue={from}
          toValue={to}
          onFromChange={(v) => setValue("from", v, { shouldValidate: true })}
          onToChange={(v) => setValue("to", v, { shouldValidate: true })}
          fromError={errors.from?.message}
          toError={errors.to?.message}
        />
      </div>

      {/* FileDrop */}
      <div className="space-y-1.5">
        <Label>Soporte médico</Label>
        <FileDrop
          onFile={setFileName}
          selectedFile={fileName}
          label="Subir incapacidad médica"
          accept="image/*,.pdf"
        />
      </div>

      {/* Observaciones */}
      <div className="space-y-1.5">
        <Label htmlFor="inc-obs">Observaciones (opcional)</Label>
        <Textarea
          id="inc-obs"
          placeholder="Información adicional sobre tu incapacidad..."
          onChange={(e) => setValue("observaciones", e.target.value)}
          className="border-line resize-none"
          rows={3}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 font-semibold"
        aria-label="Radicar solicitud de incapacidad"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Radicando...
          </span>
        ) : (
          "Radicar solicitud"
        )}
      </Button>
    </form>
  );
}

// ── Licencia form ──────────────────────────────────────────────────────────────
const MOTIVOS = [
  "Calamidad doméstica",
  "Matrimonio",
  "Estudios / capacitación",
  "Asuntos personales",
  "Otro",
];

function LicenciaForm() {
  const submitLeave = useSubmitLeave();
  const [radicado, setRadicado] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const {
    handleSubmit, setValue, watch, formState: { errors, isSubmitting },
  } = useForm<LicenciaForm>({
    resolver: zodResolver(licenciaSchema),
    defaultValues: { kind: "licencia_remunerada", motivo: "", from: "", to: "", comentario: "" },
  });

  const kind = watch("kind");
  const motivo = watch("motivo");
  const from = watch("from");
  const to = watch("to");

  const onSubmit = async (data: LicenciaForm) => {
    try {
      const result = await submitLeave.mutateAsync({
        quickerId: "q2",
        kind: data.kind,
        reason: data.motivo,
        from: data.from,
        to: data.to,
        fileName: fileName || undefined,
      });
      setRadicado(result.id);
      toast.success("Solicitud de licencia radicada");
    } catch {
      toast.error("Error al radicar la solicitud. Intenta de nuevo.");
    }
  };

  if (radicado) {
    return <SuccessState radicado={radicado as string} onNew={() => setRadicado(null)} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Tipo de licencia — radio cards */}
      <div className="space-y-1.5">
        <Label>Tipo de licencia</Label>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de licencia">
          {(
            [
              { value: "licencia_remunerada", label: "Remunerada", hint: "Con salario" },
              { value: "licencia_no_remunerada", label: "No remunerada", hint: "Sin salario" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={kind === opt.value}
              onClick={() => setValue("kind", opt.value, { shouldValidate: true })}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                kind === opt.value
                  ? "border-brand-600 bg-brand-50"
                  : "border-line bg-surface hover:border-brand-300",
              )}
            >
              <span className={cn("font-semibold text-sm", kind === opt.value ? "text-brand-700" : "text-ink")}>
                {opt.label}
              </span>
              <span className="text-xs text-muted">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Motivo */}
      <div className="space-y-1.5">
        <Label htmlFor="lic-motivo">Motivo</Label>
        <Select value={motivo} onValueChange={(v) => v && setValue("motivo", v, { shouldValidate: true })}>
          <SelectTrigger
            id="lic-motivo"
            className={cn("w-full border-line", errors.motivo && "border-danger")}
            aria-invalid={!!errors.motivo}
          >
            <SelectValue placeholder="Selecciona el motivo" />
          </SelectTrigger>
          <SelectContent>
            {MOTIVOS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.motivo && <p className="text-xs text-danger">{errors.motivo.message}</p>}
      </div>

      {/* Fechas */}
      <div className="space-y-1.5">
        <Label>Período de licencia</Label>
        <DateRangePicker
          fromValue={from}
          toValue={to}
          onFromChange={(v) => setValue("from", v, { shouldValidate: true })}
          onToChange={(v) => setValue("to", v, { shouldValidate: true })}
          fromError={errors.from?.message}
          toError={errors.to?.message}
        />
      </div>

      {/* Comentario */}
      <div className="space-y-1.5">
        <Label htmlFor="lic-comentario">Comentario (opcional)</Label>
        <Textarea
          id="lic-comentario"
          placeholder="Información adicional sobre tu solicitud..."
          onChange={(e) => setValue("comentario", e.target.value)}
          className="border-line resize-none"
          rows={3}
        />
      </div>

      {/* Soporte opcional */}
      <div className="space-y-1.5">
        <Label>Soporte documental</Label>
        <FileDrop
          onFile={setFileName}
          selectedFile={fileName}
          label="Subir soporte"
          optional
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 font-semibold"
        aria-label="Radicar solicitud de licencia"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Radicando...
          </span>
        ) : (
          "Radicar solicitud"
        )}
      </Button>
    </form>
  );
}

// ── Main Solicitudes page ──────────────────────────────────────────────────────
export default function Solicitudes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Solicitudes</h1>
        <p className="mt-0.5 text-sm text-muted">Incapacidades y licencias</p>
      </div>

      <Tabs defaultValue="incapacidad" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="incapacidad">Incapacidad</TabsTrigger>
          <TabsTrigger value="licencia">Licencia</TabsTrigger>
        </TabsList>

        <TabsContent value="incapacidad">
          <IncapacidadForm />
        </TabsContent>

        <TabsContent value="licencia">
          <LicenciaForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
