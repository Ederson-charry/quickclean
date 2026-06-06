import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Logo } from "@/components/layout/Logo";
import loginBg from "@/assets/login-bg.jpg";

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
  nombre:    z.string().min(2, "Nombre requerido"),
  correo:    z.string().email("Correo inválido"),
  celular:   z.string().min(7, "Celular inválido"),
  ciudad:    z.string().min(1, "Selecciona una ciudad"),
  contrasena: z.string().min(8, "Mínimo 8 caracteres"),
  terminos:  z.boolean().refine((v) => v === true, "Debes aceptar los términos"),
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
    /* Full-bleed background — matches Login */
    <div
      className="relative min-h-screen w-full bg-cover bg-center flex items-center justify-center px-4 py-12 overflow-x-hidden animate-fade"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Brand gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(6,58,140,0.90) 0%, rgba(11,91,214,0.80) 50%, rgba(10,33,80,0.88) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Glassmorphism card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-rise"
        style={{
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          animationDelay: "0.05s",
        }}
      >
        <div className="px-8 py-10 sm:px-10">

          {/* Logo — stagger 1 */}
          <div
            className="flex justify-center mb-6 animate-rise"
            style={{ animationDelay: "0.15s" }}
          >
            <Logo height={48} className="text-white" />
          </div>

          {/* Headline — stagger 2 */}
          <div
            className="text-center mb-8 animate-rise"
            style={{ animationDelay: "0.25s" }}
          >
            <h1 className="text-2xl font-bold text-white font-display leading-tight">
              Crea tu cuenta
            </h1>
            <p className="mt-1.5 text-sm text-white/70">
              Rápido, seguro y a tu medida
            </p>
          </div>

          {/* Form — stagger 3 */}
          <div className="animate-rise" style={{ animationDelay: "0.35s" }}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-white/90 text-sm font-medium">
                  Nombre completo
                </Label>
                <Input
                  id="nombre"
                  placeholder="Laura Gómez"
                  autoComplete="name"
                  {...register("nombre")}
                  aria-invalid={!!errors.nombre}
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
                />
                {errors.nombre && (
                  <p className="text-xs text-red-300">{errors.nombre.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="correo" className="text-white/90 text-sm font-medium">
                  Correo electrónico
                </Label>
                <Input
                  id="correo"
                  type="email"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  {...register("correo")}
                  aria-invalid={!!errors.correo}
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
                />
                {errors.correo && (
                  <p className="text-xs text-red-300">{errors.correo.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="celular" className="text-white/90 text-sm font-medium">
                  Celular
                </Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 rounded-lg border border-white/25 bg-white/10 text-sm text-white/70 select-none">
                    +57
                  </span>
                  <Input
                    id="celular"
                    type="tel"
                    placeholder="300 123 4567"
                    autoComplete="tel"
                    className="flex-1 bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
                    {...register("celular")}
                    aria-invalid={!!errors.celular}
                  />
                </div>
                {errors.celular && (
                  <p className="text-xs text-red-300">{errors.celular.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ciudad" className="text-white/90 text-sm font-medium">
                  Ciudad
                </Label>
                <Select
                  onValueChange={(v: unknown) =>
                    setValue("ciudad", String(v), { shouldValidate: true })
                  }
                >
                  <SelectTrigger
                    id="ciudad"
                    aria-invalid={!!errors.ciudad}
                    className="bg-white/15 border-white/25 text-white focus:border-white/60 focus:bg-white/20 data-[placeholder]:text-white/45"
                  >
                    <SelectValue placeholder="Selecciona tu ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {CIUDADES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ciudad && (
                  <p className="text-xs text-red-300">{errors.ciudad.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contrasena" className="text-white/90 text-sm font-medium">
                  Contraseña
                </Label>
                <Input
                  id="contrasena"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("contrasena")}
                  aria-invalid={!!errors.contrasena}
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
                />
                {errors.contrasena && (
                  <p className="text-xs text-red-300">{errors.contrasena.message}</p>
                )}
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="terminos"
                  checked={terminos}
                  onCheckedChange={(checked) =>
                    setValue("terminos", checked === true, { shouldValidate: true })
                  }
                  aria-invalid={!!errors.terminos}
                  className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-brand-700"
                />
                <div>
                  <Label
                    htmlFor="terminos"
                    className="text-sm leading-relaxed cursor-pointer text-white/80"
                  >
                    Acepto los{" "}
                    <span className="text-white underline">términos y condiciones</span>
                    {" "}y la{" "}
                    <span className="text-white underline">política de privacidad</span>
                  </Label>
                  {errors.terminos && (
                    <p className="text-xs text-red-300 mt-1">{errors.terminos.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-brand-700 font-semibold hover:bg-white/90 mt-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-white/70">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                className="text-white font-semibold underline underline-offset-2 hover:text-white/80"
              >
                Inicia sesión
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
