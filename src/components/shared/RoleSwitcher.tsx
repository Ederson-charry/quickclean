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
            "min-h-[36px] px-3 py-1.5 text-sm rounded-full transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-1",
            role === r.key ? "bg-brand-600 text-white font-medium shadow-sm" : "text-ink-2 hover:text-ink hover:bg-bg",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
