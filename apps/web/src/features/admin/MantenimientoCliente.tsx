import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useClients, useCreateClient, useUpdateClient } from "@/hooks/queries";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CITIES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
];

const schema = z.object({
  name: z.string().min(3, "Nombre requerido (mín. 3 caracteres)"),
  doc: z.string().min(5, "Documento requerido"),
  email: z.string().email("Correo inválido"),
  phone: z.string().min(10, "Celular requerido"),
  address: z.string().min(5, "Dirección requerida"),
  city: z.string().min(2, "Ciudad requerida"),
  type: z.enum(["persona", "empresa"]),
  status: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function MantenimientoCliente() {
  const navigate = useNavigate();
  // We use useParams to detect if we're editing (/admin/clientes/$id) or creating (/admin/clientes/nuevo)
  const params = useParams({ strict: false }) as { id?: string };
  const clientId = params.id && params.id !== "nuevo" ? params.id : undefined;
  const isEditing = !!clientId;

  const { data: clients } = useClients();
  const existing = clientId ? clients?.find((c) => c.id === clientId) : undefined;

  const { mutateAsync: createClient, isPending: isCreating } = useCreateClient();
  const { mutateAsync: updateClient, isPending: isUpdating } = useUpdateClient();
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "persona",
      status: true,
    },
  });

  // Prefill form when editing
  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        doc: existing.doc,
        email: existing.email,
        phone: existing.phone,
        address: existing.address,
        city: existing.city,
        type: existing.type,
        status: existing.status === "activo",
      });
    }
  }, [existing, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      doc: values.doc,
      email: values.email,
      phone: values.phone,
      address: values.address,
      city: values.city,
      type: values.type,
      status: values.status ? ("activo" as const) : ("inactivo" as const),
      bookingsCount: existing?.bookingsCount ?? 0,
      totalSpent: existing?.totalSpent ?? 0,
    };

    try {
      if (isEditing && clientId) {
        await updateClient({ id: clientId, input: payload });
        toast.success(`Cliente "${values.name}" actualizado exitosamente`);
      } else {
        await createClient(payload);
        toast.success(`Cliente "${values.name}" creado exitosamente`);
      }
      navigate({ to: "/admin/clientes" });
    } catch {
      toast.error(
        isEditing
          ? "Error al actualizar el cliente. Inténtalo de nuevo."
          : "Error al crear el cliente. Inténtalo de nuevo.",
      );
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/clientes"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-faint hover:text-ink",
          )}
          aria-label="Volver a Clientes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-display)] text-ink">
            {isEditing ? "Editar Cliente" : "Crear Cliente"}
          </h1>
          <p className="mt-0.5 text-sm text-faint">
            {isEditing ? "Actualiza los datos del cliente" : "Registra un nuevo cliente"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left column */}
          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-ink">
                Nombre completo <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Laura Gómez"
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
                placeholder="1.012.345.678"
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

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-ink">
                Correo electrónico <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
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

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium text-ink">
                Celular <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+57 311 234 5678"
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
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-sm font-medium text-ink">
                Dirección <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="Cra 7 # 45-10, Chapinero"
                aria-required="true"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? "address-error" : undefined}
                {...register("address")}
              />
              {errors.address && (
                <p id="address-error" className="text-xs text-danger" role="alert">
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-sm font-medium text-ink">
                Ciudad <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="city"
                      className="w-full"
                      aria-required="true"
                      aria-invalid={!!errors.city}
                    >
                      <SelectValue placeholder="Selecciona una ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.city && (
                <p className="text-xs text-danger" role="alert">
                  {errors.city.message}
                </p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-sm font-medium text-ink">
                Tipo de cliente <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="type"
                      className="w-full"
                      aria-required="true"
                      aria-invalid={!!errors.type}
                    >
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="persona">Persona natural</SelectItem>
                      <SelectItem value="empresa">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-danger" role="alert">
                  {errors.type.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-ink">Estado</Label>
              <div className="flex items-center gap-3 pt-1">
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="status"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Estado del cliente"
                    />
                  )}
                />
                <Label htmlFor="status" className="text-sm text-ink-2 cursor-pointer">
                  {undefined}
                </Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <span className="text-sm text-ink-2">
                      {field.value ? "Activo" : "Inactivo"}
                    </span>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-5">
          <Link
            to="/admin/clientes"
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
            ) : isEditing ? (
              "Guardar cambios"
            ) : (
              "Crear cliente"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
