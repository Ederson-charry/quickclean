import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/http", () => ({
  apiFetch: vi.fn(async (path: string) => {
    if (path === "/auth/login") return { accessToken: "jwt-123" };
    if (path === "/auth/me") {
      return { id: "u1", email: "admin@quickclean.co", roles: ["super_admin"], permissions: ["audit.read"] };
    }
    return {};
  }),
}));

import { useAuth } from "./useAuth";
import { useSession } from "@/stores/session";

describe("useAuth.login", () => {
  beforeEach(() => useSession.getState().logout());

  it("guarda el token, aplica el perfil y enruta por rol", async () => {
    const { result } = renderHook(() => useAuth());
    let outcome: { home: string } | { mustChangePassword: true } = { home: "" };
    await act(async () => {
      outcome = await result.current.login({ email: "admin@quickclean.co", password: "x".repeat(12) });
    });
    expect(useSession.getState().accessToken).toBe("jwt-123");
    expect(useSession.getState().role).toBe("admin");
    expect(useSession.getState().permissions).toContain("audit.read");
    expect("home" in outcome && outcome.home).toBe("/admin");
  });
});
