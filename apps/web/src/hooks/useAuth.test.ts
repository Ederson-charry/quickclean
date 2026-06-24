import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/http", () => ({ apiFetch: vi.fn(async () => ({ accessToken: "jwt-123" })) }));

import { useAuth } from "./useAuth";
import { useSession } from "@/stores/session";

describe("useAuth.login", () => {
  beforeEach(() => useSession.getState().logout());

  it("guarda el access token al hacer login", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login({ email: "a@b.co", password: "x".repeat(12) });
    });
    expect(useSession.getState().accessToken).toBe("jwt-123");
  });
});
