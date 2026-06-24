import { apiFetch } from "@/lib/http";
import { useSession } from "@/stores/session";
import type { Role } from "@/mocks/types";
import type { LoginInput } from "@quickclean/shared";

interface Profile {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

const ADMIN_ROLES = ["super_admin", "ops", "finance", "auditor"];

/** Mapea los roles del backend al shell del front + su home. */
function mapRole(roles: string[]): { role: Role; home: string } {
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return { role: "admin", home: "/admin" };
  if (roles.includes("quicker")) return { role: "quicker", home: "/pro" };
  return { role: "client", home: "/app" };
}

export type LoginOutcome = { mustChangePassword: true } | { home: string };

export function useAuth() {
  const setSession = useSession((s) => s.setSession);
  const applyProfile = useSession((s) => s.applyProfile);

  async function login(input: LoginInput): Promise<LoginOutcome> {
    const res = await apiFetch<{ accessToken: string } | { mustChangePassword: true }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if ("mustChangePassword" in res) {
      return { mustChangePassword: true };
    }

    setSession(res.accessToken);
    try {
      const me = await apiFetch<Profile>("/auth/me", {
        headers: { Authorization: `Bearer ${res.accessToken}` },
      });
      const { role, home } = mapRole(me.roles);
      applyProfile({ role, permissions: me.permissions, name: me.email });
      return { home };
    } catch {
      // si /me falla, deja sesión básica de cliente
      applyProfile({ role: "client", permissions: [], name: input.email });
      return { home: "/app" };
    }
  }

  return { login };
}
