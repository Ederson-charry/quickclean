import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCreateQuicker } from "@/hooks/queries";
import { FileDrop } from "@/components/shared/FileDrop";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(3, "Nombre requerido (mín. 3 caracteres)"),
  doc: z.string().min(5, "Documento requerido"),
  phone: z.string().min(10, "Celular requerido"),
  email: z.string().email("Correo inválido"),
  zone: z.string().min(2, "Zona requerida"),
  contract: z.enum(["prestacion", "fijo", "indefinido"]),
  hourlyRate: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 5000,
    "Tarifa mínima $5.000",
  ),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CrearQuicker() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateQuicker();
  const [avatarFile, setAvatarFile] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contract: "prestacion",
      hourlyRate: "12000",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await mutateAsync({
        name: values.name,
        doc: values.doc,
        phone: values.phone,
        email: values.email,
        zone: values.zone,
        contract: values.contract,
        hourlyRate: parseFloat(values.hourlyRate),
        status: "activo",
        rating: 0,
        monthlyServices: 0,
        avatar: avatarFile || undefined,
      });
      toast.success(`Quicker "${values.name}" creado exitosamente`);
      navigate({ to: "/admin/quickers" });
    } catch {
      toast.error("Error al crear el Quicker. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/quickers"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-faint hover:text-ink",
          )}
          aria-label="Volver a Quickers"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-display)] text-ink">
            Crear Quicker
          </h1>
          <p className="mt-0.5 text-sm text-faint">Registra un nuevo profesional</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left column */}
          <div className="space-y-5">
            {/* Photo */}
            <div>
              <Label className="mb-2 block text-sm font-medium text-ink">
                Foto de perfil <span className="text-faint font-normal">(opcional)</span>
              </Label>
              <FileDrop
                onFile={setAvatarFile}
                accept="image/*"
                label="Subir foto"
                optional
                selectedFile={avatarFile}
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-ink">
                Nombre completo <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Diana Rojas"
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              {errors.name && (
                <p id="name-error" className="text-xs text-danger" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Doc */}
            <div className="space-y-1.5">
              <Label htmlFor="doc" className="text-sm font-medium text-ink">
                Número de documento <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="doc"
                type="text"
                placeholder="1.010.234.567"
                aria-required="true"
                aria-invalid={!!errors.doc}
                aria-describedby={errors.doc ? "doc-error" : undefined}
                {...register("doc")}
              />
              {errors.doc && (
                <p id="doc-error" className="text-xs text-danger" role="alert">
                  {errors.doc.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium text-ink">
                Celular <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+57 300 123 4567"
                aria-required="true"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
              {errors.phone && (
                <p id="phone-error" className="text-xs text-danger" role="alert">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-ink">
                Correo electrónico <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@quickclean.co"
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-xs text-danger" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Zone */}
            <div className="space-y-1.5">
              <Label htmlFor="zone" className="text-sm font-medium text-ink">
                Zona de operación <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="zone"
                type="text"
                placeholder="Chapinero"
                aria-required="true"
                aria-invalid={!!errors.zone}
                aria-describedby={errors.zone ? "zone-error" : undefined}
                {...register("zone")}
              />
              {errors.zone && (
                <p id="zone-error" className="text-xs text-danger" role="alert">
                  {errors.zone.message}
                </p>
              )}
            </div>

            {/* Contract */}
            <div className="space-y-1.5">
              <Label htmlFor="contract" className="text-sm font-medium text-ink">
                Tipo de contrato <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Controller
                name="contract"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="contract"
                      className="w-full"
                      aria-required="true"
                      aria-invalid={!!errors.contract}
                    >
                      <SelectValue placeholder="Selecciona un contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prestacion">Prestación de servicios</SelectItem>
                      <SelectItem value="fijo">Contrato fijo</SelectItem>
                      <SelectItem value="indefinido">Contrato indefinido</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.contract && (
                <p className="text-xs text-danger" role="alert">
                  {errors.contract.message}
                </p>
              )}
            </div>

            {/* Hourly Rate */}
            <div className="space-y-1.5">
              <Label htmlFor="hourlyRate" className="text-sm font-medium text-ink">
                Tarifa por hora (COP) <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="hourlyRate"
                type="text"
                inputMode="numeric"
                placeholder="12000"
                aria-required="true"
                aria-invalid={!!errors.hourlyRate}
                aria-describedby={errors.hourlyRate ? "hourlyRate-error" : undefined}
                {...register("hourlyRate")}
              />
              {errors.hourlyRate && (
                <p id="hourlyRate-error" className="text-xs text-danger" role="alert">
                  {errors.hourlyRate.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-medium text-ink">
                Notas adicionales <span className="text-faint font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Especialidades, disponibilidad, restricciones…"
                {...register("notes")}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-5">
          <Link
            to="/admin/quickers"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancelar
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar Quicker"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
