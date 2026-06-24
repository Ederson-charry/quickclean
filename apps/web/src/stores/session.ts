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
  /** Permisos reales del backend (vacío en modo demo). */
  permissions: string[];
  login: (role: Role) => void;
  setRole: (role: Role) => void;
  setSession: (accessToken: string) => void;
  /** Aplica el perfil real tras /auth/me (rol mapeado + permisos + nombre). */
  applyProfile: (p: { role: Role; permissions: string[]; name: string }) => void;
  logout: () => void;
};

export const useSession = create<SessionState>((set) => ({
  role: "client",
  user: null,
  accessToken: null,
  permissions: [],
  login: (role) => set({ role, user: USERS[role], permissions: [] }),
  setRole: (role) => set({ role, user: USERS[role] }),
  setSession: (accessToken) => set({ accessToken }),
  applyProfile: (p) => set({ role: p.role, permissions: p.permissions, user: { name: p.name } }),
  logout: () => set({ user: null, accessToken: null, permissions: [] }),
}));
