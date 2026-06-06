import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/stores/session";
import type { Role } from "@/mocks/types";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});
type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ROLES: { role: Role; label: string; color: string }[] = [
  { role: "client", label: "Entrar como Cliente", color: "bg-brand-600 hover:bg-brand-700 text-white" },
  { role: "quicker", label: "Entrar como Quicker", color: "bg-success hover:bg-success/90 text-white" },
  { role: "admin", label: "Entrar como Admin", color: "bg-navy hover:bg-navy/90 text-white" },
];

const ROLE_HOME: Record<Role, string> = {
  client: "/app",
  quicker: "/pro",
  admin: "/admin",
};

export default function Login() {
  const { login } = useSession();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (_data: LoginForm) => {
    // Demo: default login as client
    login("client");
    toast.success("¡Bienvenido, Laura!");
    navigate({ to: "/app" });
  };

  const handleDemo = (role: Role) => {
    login(role);
    toast.success(`Sesión iniciada como ${role === "client" ? "Cliente" : role === "quicker" ? "Quicker" : "Admin"}`);
    navigate({ to: ROLE_HOME[role] });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Brand panel */}
      <div className="hidden md:flex flex-col justify-center items-center flex-1 bg-gradient-to-br from-brand-600 to-brand-700 px-12 py-16 text-white">
        <div className="max-w-xs text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Sparkles className="h-10 w-10" />
            <span className="font-[var(--font-display)] text-4xl font-bold tracking-tight">QuickClean</span>
          </div>
          <p className="text-xl font-medium leading-relaxed text-white/90">
            Servicios de limpieza profesional a domicilio
          </p>
          <p className="mt-4 text-sm text-white/70">
            Tu hogar impecable, en tus manos.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 max-w-md mx-auto w-full md:max-w-none md:w-[480px] md:mx-0">
        {/* Mobile brand */}
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <Sparkles className="h-6 w-6 text-brand-600" />
          <span className="font-[var(--font-display)] text-2xl font-bold text-brand-600">QuickClean</span>
        </div>

        <h1 className="text-2xl font-bold text-ink mb-2">Iniciar sesión</h1>
        <p className="text-sm text-muted mb-8">Accede a tu cuenta para gestionar tus servicios</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>

        {/* Decorative social buttons */}
        <div className="mt-4 space-y-2">
          <Button variant="outline" className="w-full" type="button" disabled>
            Continuar con Google
          </Button>
          <Button variant="outline" className="w-full" type="button" disabled>
            Continuar con Apple
          </Button>
        </div>

        <div className="mt-6 text-center text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="text-brand-600 hover:underline font-medium">
            Regístrate
          </Link>
        </div>

        <Separator className="my-6" />

        {/* Demo buttons */}
        <div className="space-y-2">
          <p className="text-xs text-center text-muted font-medium uppercase tracking-wide mb-3">Acceso de demostración</p>
          {DEMO_ROLES.map(({ role, label, color }) => (
            <button
              key={role}
              type="button"
              onClick={() => handleDemo(role)}
              className={`w-full rounded-lg py-2.5 px-4 text-sm font-medium transition-opacity hover:opacity-90 ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
