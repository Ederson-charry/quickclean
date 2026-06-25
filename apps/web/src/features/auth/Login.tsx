import { useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/mocks/types";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(12, "Mínimo 12 caracteres"),
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
  const { login: apiLogin, changePassword } = useAuth();
  const navigate = useNavigate();
  const [forceChange, setForceChange] = useState<{ email: string; current: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await apiLogin(data);
      if ("mustChangePassword" in res) {
        toast.info("Debes crear una contraseña nueva para continuar.");
        setForceChange({ email: data.email, current: data.password });
        return;
      }
      // el rol y los permisos reales ya quedaron en la sesión vía /auth/me
      toast.success("Sesión iniciada");
      navigate({ to: res.home });
    } catch {
      toast.error("Credenciales inválidas");
    }
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

          {/* Cambio de contraseña forzado (primer ingreso) */}
          {forceChange ? (
            <div className="animate-rise" style={{ animationDelay: "0.2s" }}>
              <ForceChangeForm
                email={forceChange.email}
                current={forceChange.current}
                onDone={(home) => {
                  toast.success("Contraseña actualizada");
                  navigate({ to: home });
                }}
                onCancel={() => setForceChange(null)}
                changePassword={changePassword}
              />
            </div>
          ) : (
          <>
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
                className="w-full bg-white !text-brand-700 font-semibold hover:bg-white/90 mt-1"
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
          </>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Formulario de cambio de contraseña forzado (primer ingreso) ─────────────────
const changeSchema = z
  .object({
    newPassword: z.string().min(12, "Mínimo 12 caracteres"),
    confirm: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((d) => d.newPassword === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });
type ChangeForm = z.infer<typeof changeSchema>;

function ForceChangeForm({
  email,
  current,
  onDone,
  onCancel,
  changePassword,
}: {
  email: string;
  current: string;
  onDone: (home: string) => void;
  onCancel: () => void;
  changePassword: (input: { email: string; currentPassword: string; newPassword: string }) => Promise<{ home: string }>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeForm>({ resolver: zodResolver(changeSchema) });

  const onSubmit = async (data: ChangeForm) => {
    try {
      const { home } = await changePassword({ email, currentPassword: current, newPassword: data.newPassword });
      onDone(home);
    } catch {
      toast.error("No se pudo cambiar la contraseña. Verifica la política e inténtalo de nuevo.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-white/80">
        Tu cuenta requiere una contraseña nueva. Crea una de al menos 12 caracteres para{" "}
        <span className="font-semibold text-white">{email}</span>.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword" className="text-white/90 text-sm font-medium">
          Nueva contraseña
        </Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          {...register("newPassword")}
          aria-invalid={!!errors.newPassword}
          className="bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
        />
        {errors.newPassword && <p className="text-xs text-red-300">{errors.newPassword.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm" className="text-white/90 text-sm font-medium">
          Confirmar contraseña
        </Label>
        <Input
          id="confirm"
          type="password"
          placeholder="••••••••••••"
          autoComplete="new-password"
          {...register("confirm")}
          aria-invalid={!!errors.confirm}
          className="bg-white/15 border-white/25 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
        />
        {errors.confirm && <p className="text-xs text-red-300">{errors.confirm.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full bg-white !text-brand-700 font-semibold hover:bg-white/90 mt-1"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Guardando..." : "Crear contraseña e ingresar"}
      </Button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-sm text-white/70 underline underline-offset-2 hover:text-white min-h-[40px]"
      >
        Volver
      </button>
    </form>
  );
}
