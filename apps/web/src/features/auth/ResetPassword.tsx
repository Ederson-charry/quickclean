import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import loginBg from "@/assets/login-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const schema = z
  .object({
    newPassword: z.string().min(12, "Mínimo 12 caracteres"),
    confirm: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((d) => d.newPassword === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });
type FormValues = z.infer<typeof schema>;

function getToken(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export default function ResetPassword() {
  const { reset } = useAuth();
  const [token] = useState(getToken);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    try {
      await reset(token, data.newPassword);
      setDone(true);
    } catch {
      setError("El enlace es inválido o expiró. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”.");
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-cover bg-center px-4 py-12"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-700/80 to-navy/80" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-xl sm:p-10">
        <div className="mb-6 flex justify-center">
          <Logo height={44} className="text-white" />
        </div>
        <h1 className="text-center font-display text-2xl font-bold text-white">Restablecer contraseña</h1>

        {done ? (
          <div className="mt-6 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="size-12 text-white" />
            <p className="text-sm text-white/85">Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p>
            <Link to="/login" className="font-semibold text-white underline underline-offset-2 hover:text-white/80">
              Ir a iniciar sesión
            </Link>
          </div>
        ) : !token ? (
          <div className="mt-6 text-center text-sm text-white/85">
            Falta el token del enlace. Abre el enlace que te enviamos por correo o solicita uno nuevo.
            <div className="mt-4">
              <Link to="/login" className="font-semibold text-white underline underline-offset-2">
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-sm font-medium text-white/90">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••••••"
                autoComplete="new-password"
                {...register("newPassword")}
                aria-invalid={!!errors.newPassword}
                className="border-white/25 bg-white/15 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
              />
              {errors.newPassword && <p className="text-xs text-red-300">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium text-white/90">Confirmar contraseña</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••••••"
                autoComplete="new-password"
                {...register("confirm")}
                aria-invalid={!!errors.confirm}
                className="border-white/25 bg-white/15 text-white placeholder:text-white/45 focus:border-white/60 focus:bg-white/20"
              />
              {errors.confirm && <p className="text-xs text-red-300">{errors.confirm.message}</p>}
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full bg-white font-semibold !text-brand-700 hover:bg-white/90">
              {isSubmitting ? "Guardando..." : "Cambiar contraseña"}
            </Button>
            <Link to="/login" className="block text-center text-sm text-white/70 underline underline-offset-2 hover:text-white">
              Volver
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
