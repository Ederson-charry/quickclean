import { create } from "zustand";
import type { Role } from "@/mocks/types";

const USERS: Record<Role, { name: string }> = {
  client: { name: "Laura Gómez" },
  quicker: { name: "Carolina Méndez" },
  admin: { name: "Operación QuickClean" },
};

type SessionState = {
  role: Role;
  user: { name: string } | null;
  /** Access token del backend (en memoria). El refresh vive en cookie HttpOnly. */
  accessToken: string | null;
  login: (role: Role) => void;
  setRole: (role: Role) => void;
  setSession: (accessToken: string) => void;
  logout: () => void;
};

export const useSession = create<SessionState>((set) => ({
  role: "client",
  user: null,
  accessToken: null,
  login: (role) => set({ role, user: USERS[role] }),
  setRole: (role) => set({ role, user: USERS[role] }),
  setSession: (accessToken) => set({ accessToken }),
  logout: () => set({ user: null, accessToken: null }),
}));
