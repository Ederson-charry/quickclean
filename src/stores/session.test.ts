import { describe, it, expect, beforeEach } from "vitest";
import { useSession } from "@/stores/session";

describe("session store", () => {
  beforeEach(() => useSession.getState().logout());
  it("login sets role and user", () => {
    useSession.getState().login("quicker");
    expect(useSession.getState().role).toBe("quicker");
    expect(useSession.getState().user).not.toBeNull();
  });
  it("setRole switches role keeping session", () => {
    useSession.getState().login("client");
    useSession.getState().setRole("admin");
    expect(useSession.getState().role).toBe("admin");
    expect(useSession.getState().user).not.toBeNull();
  });
});
