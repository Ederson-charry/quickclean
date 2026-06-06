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
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/stores/session";
import type { Role } from "@/mocks/types";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});
type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ROLES: { role: Role; label: string; color: string }[] = [
  { role: "client",  label: "Entrar como Cliente",  color: "bg-brand-600 hover:bg-brand-700 text-white" },
  { role: "quicker", label: "Entrar como Quicker",  color: "bg-success hover:bg-success/90 text-white" },
  { role: "admin",   label: "Entrar como Admin",    color: "bg-navy hover:bg-navy/90 text-white" },
];

const ROLE_HOME: Record<Role, string> = {
  client:  "/app",
  quicker: "/pro",
  admin:   "/admin",
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
    login("client");
    toast.success("¡Bienvenido, Laura!");
    navigate({ to: "/app" });
  };

  const handleDemo = (role: Role) => {
    login(role);
    toast.success(
      `Sesión iniciada como ${role === "client" ? "Cliente" : role === "quicker" ? "Quicker" : "Admin"}`
    );
    navigate({ to: ROLE_HOME[role] });
  };

  return (
    /* Full-bleed background */
    <div
      className="relative min-h-screen w-full bg-cover bg-center flex items-center justify-center px-4 py-12 overflow-x-hidden animate-fade"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Brand gradient overlay for contrast + mood */}
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

          {/* Logo — stagger delay 1 */}
          <div
            className="flex justify-center mb-6 animate-rise"
            style={{ animationDelay: "0.15s" }}
          >
            <Logo height={48} className="text-white" />
          </div>

          {/* Headline + subline — stagger delay 2 */}
          <div
            className="text-center mb-8 animate-rise"
            style={{ animationDelay: "0.25s" }}
          >
            <h1 className="text-2xl font-bold text-white font-display leading-tight">
              Bienvenido de vuelta
            </h1>
            <p className="mt-1.5 text-sm text-white/70">
              Tu hogar impecable, a un clic de distancia
            </p>
          </div>

          {/* Form — stagger delay 3 */}
          <div className="animate-rise" style={{ animationDelay: "0.35s" }}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/90 text-sm font-medium">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
                />
                {errors.email && (
                  <p className="text-xs text-red-300">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/90 text-sm font-medium">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                  className="bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
                />
                {errors.password && (
                  <p className="text-xs text-red-300">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-brand-700 font-semibold hover:bg-white/90 mt-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>

            {/* Decorative social buttons */}
            <div className="mt-3 space-y-2">
              <Button
                variant="outline"
                className="w-full border-white/25 text-white/85 bg-white/10 hover:bg-white/20 hover:text-white"
                type="button"
                disabled
              >
                Continuar con Google
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/25 text-white/85 bg-white/10 hover:bg-white/20 hover:text-white"
                type="button"
                disabled
              >
                Continuar con Apple
              </Button>
            </div>

            <div className="mt-5 text-center text-sm text-white/70">
              ¿No tienes cuenta?{" "}
              <Link
                to="/registro"
                className="text-white font-semibold underline underline-offset-2 hover:text-white/80"
              >
                Regístrate
              </Link>
            </div>
          </div>

          {/* Demo buttons — stagger delay 4 */}
          <div className="animate-rise" style={{ animationDelay: "0.48s" }}>
            <Separator className="my-5 bg-white/20" />
            <p className="text-xs text-center text-white/55 font-medium uppercase tracking-widest mb-3">
              Acceso de demostración
            </p>
            <div className="space-y-2">
              {DEMO_ROLES.map(({ role, label, color }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleDemo(role)}
                  aria-label={label}
                  className={`w-full rounded-xl min-h-[44px] py-2.5 px-4 text-sm font-semibold transition-all duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60 ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
