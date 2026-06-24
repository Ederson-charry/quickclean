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
  login: (role: Role) => void;
  setRole: (role: Role) => void;
  logout: () => void;
};

export const useSession = create<SessionState>((set) => ({
  role: "client",
  user: null,
  login: (role) => set({ role, user: USERS[role] }),
  setRole: (role) => set({ role, user: USERS[role] }),
  logout: () => set({ user: null }),
}));
