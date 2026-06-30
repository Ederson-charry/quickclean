import { Outlet, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Home, CalendarDays, Layers, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Brand } from "./Brand";
import { useSession } from "@/stores/session";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Inicio", icon: Home, exact: true },
  { to: "/app/reservar", label: "Reservar", icon: CalendarDays, exact: false },
  { to: "/app/servicios", label: "Servicios", icon: Layers, exact: false },
];

export function ClientShell() {
  const { user, logout } = useSession();
  const accessToken = useSession((s) => s.accessToken);
  const navigate = useNavigate();
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "CL";

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-3 sm:px-6">
          <Brand />
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación cliente">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={item.exact ? { exact: true } : undefined}
                className="px-3 py-2 text-sm rounded-lg text-ink-2 hover:text-ink hover:bg-bg transition-colors"
                activeProps={{ className: "px-3 py-2 text-sm rounded-lg text-brand-600 font-medium bg-brand-50" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm text-ink">{user?.name ?? "Cliente"}</span>
                    <span className="text-xs text-faint">Cliente</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-danger focus:text-danger focus:bg-danger/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      {/* Mobile bottom bar */}
      <nav className="md:hidden sticky bottom-0 z-40 border-t border-line bg-surface safe-area-inset-bottom" aria-label="Navegación móvil">
        <div className="flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={item.exact ? { exact: true } : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 min-h-[56px] text-xs text-faint transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50",
              )}
              activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-3 min-h-[56px] text-xs text-brand-600 font-medium" }}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
