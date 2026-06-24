import { apiFetch } from "@/lib/http";
import { useSession } from "@/stores/session";
import type { LoginInput } from "@quickclean/shared";

export type LoginResponse = { accessToken: string } | { mustChangePassword: true };

export function useAuth() {
  const setSession = useSession((s) => s.setSession);

  async function login(input: LoginInput): Promise<LoginResponse> {
    const res = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if ("accessToken" in res) {
      setSession(res.accessToken);
    }
    return res;
  }

  return { login };
}
