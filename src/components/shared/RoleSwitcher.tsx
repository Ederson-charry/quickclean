import { useSession } from "@/stores/session";
import { useNavigate } from "@tanstack/react-router";
import type { Role } from "@/mocks/types";
import { cn } from "@/lib/utils";

const ROLES: { key: Role; label: string; home: string }[] = [
  { key: "client", label: "Cliente", home: "/app" },
  { key: "quicker", label: "Quicker", home: "/pro" },
  { key: "admin", label: "Admin", home: "/admin" },
];

export function RoleSwitcher() {
  const { role, setRole } = useSession();
  const navigate = useNavigate();
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-0.5 shadow-sm" role="tablist" aria-label="Cambiar rol">
      {ROLES.map((r) => (
        <button
          key={r.key}
          role="tab"
          aria-selected={role === r.key}
          onClick={() => { setRole(r.key); navigate({ to: r.home }); }}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full transition-colors",
            role === r.key ? "bg-brand-600 text-white" : "text-ink-2 hover:text-ink",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
