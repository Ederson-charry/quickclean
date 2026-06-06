import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/layout/Logo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "@/stores/session";

const registroSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  correo: z.string().email("Correo inválido"),
  celular: z.string().min(7, "Celular inválido"),
  ciudad: z.string().min(1, "Selecciona una ciudad"),
  contrasena: z.string().min(8, "Mínimo 8 caracteres"),
  terminos: z.boolean().refine((v) => v === true, "Debes aceptar los términos"),
});
type RegistroForm = z.infer<typeof registroSchema>;

const CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga"];

export default function Registro() {
  const { login } = useSession();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistroForm>({
    resolver: zodResolver(registroSchema),
    defaultValues: { terminos: false },
  });

  const terminos = watch("terminos");

  const onSubmit = async (_data: RegistroForm) => {
    login("client");
    toast.success("¡Cuenta creada! Bienvenida, Laura 🎉");
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Brand panel */}
      <div className="hidden md:flex flex-col justify-center items-center flex-1 bg-gradient-to-br from-brand-600 to-brand-700 px-12 py-16 text-white">
        <div className="max-w-xs text-center">
          <div className="flex items-center justify-center mb-8">
            <Logo height={72} className="text-white" />
          </div>
          <p className="text-xl font-medium leading-relaxed text-white/90">
            Crea tu cuenta y agenda tu primer servicio hoy
          </p>
          <p className="mt-4 text-sm text-white/70">
            Rápido, seguro y a tu medida.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 max-w-md mx-auto w-full md:max-w-none md:w-[480px] md:mx-0">
        {/* Mobile brand */}
        <div className="flex items-center mb-8 md:hidden">
          <Logo height={36} className="text-brand-600" />
        </div>

        <h1 className="text-2xl font-bold text-ink mb-2">Crear cuenta</h1>
        <p className="text-sm text-muted mb-8">Completa tus datos para empezar</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              placeholder="Laura Gómez"
              autoComplete="name"
              {...register("nombre")}
              aria-invalid={!!errors.nombre}
            />
            {errors.nombre && <p className="text-xs text-danger">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="correo">Correo electrónico</Label>
            <Input
              id="correo"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              {...register("correo")}
              aria-invalid={!!errors.correo}
            />
            {errors.correo && <p className="text-xs text-danger">{errors.correo.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="celular">Celular</Label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 rounded-lg border border-line bg-bg text-sm text-muted select-none">
                +57
              </span>
              <Input
                id="celular"
                type="tel"
                placeholder="300 123 4567"
                autoComplete="tel"
                className="flex-1"
                {...register("celular")}
                aria-invalid={!!errors.celular}
              />
            </div>
            {errors.celular && <p className="text-xs text-danger">{errors.celular.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Select onValueChange={(v: unknown) => setValue("ciudad", String(v), { shouldValidate: true })}>
              <SelectTrigger id="ciudad" aria-invalid={!!errors.ciudad}>
                <SelectValue placeholder="Selecciona tu ciudad" />
              </SelectTrigger>
              <SelectContent>
                {CIUDADES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ciudad && <p className="text-xs text-danger">{errors.ciudad.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("contrasena")}
              aria-invalid={!!errors.contrasena}
            />
            {errors.contrasena && <p className="text-xs text-danger">{errors.contrasena.message}</p>}
          </div>

          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="terminos"
              checked={terminos}
              onCheckedChange={(checked) => setValue("terminos", checked === true, { shouldValidate: true })}
              aria-invalid={!!errors.terminos}
            />
            <div>
              <Label htmlFor="terminos" className="text-sm leading-relaxed cursor-pointer">
                Acepto los{" "}
                <span className="text-brand-600 underline">términos y condiciones</span>
                {" "}y la{" "}
                <span className="text-brand-600 underline">política de privacidad</span>
              </Label>
              {errors.terminos && <p className="text-xs text-danger mt-1">{errors.terminos.message}</p>}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
