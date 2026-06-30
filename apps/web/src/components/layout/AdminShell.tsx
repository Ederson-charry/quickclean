import { Outlet, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserRound, CreditCard, FileText, ShieldCheck, Tag, Sparkles, CalendarCheck, ClipboardList, Banknote, FileSpreadsheet, CalendarClock, FileSignature, Receipt, Bell, Menu, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Brand } from "./Brand";
import { useSession } from "@/stores/session";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  perm?: string;
};

const NAV: NavItem[] = [
  { to: "/admin", label: "Indicadores", icon: LayoutDashboard, exact: true },
  { to: "/admin/quickers", label: "Quickers", icon: Users, exact: false, perm: "user.manage" },
  { to: "/admin/clientes", label: "Clientes", icon: UserRound, exact: false, perm: "user.manage" },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard, exact: false },
  { to: "/admin/facturacion", label: "Facturación", icon: FileText, exact: false },
  { to: "/admin/reservas", label: "Reservas", icon: CalendarCheck, exact: false, perm: "booking.read" },
  { to: "/admin/asignacion", label: "Asignación", icon: ClipboardList, exact: false, perm: "assignment.manage" },
  { to: "/admin/solicitudes", label: "Solicitudes", icon: CalendarClock, exact: false, perm: "leave.manage" },
  { to: "/admin/contratos", label: "Contratos", icon: FileSignature, exact: false, perm: "contract.manage" },
  { to: "/admin/compensacion", label: "Compensación", icon: Banknote, exact: false, perm: "compensation.manage" },
  { to: "/admin/nomina", label: "Nómina", icon: Receipt, exact: false, perm: "compensation.manage" },
  { to: "/admin/conciliacion", label: "Conciliación GAF", icon: FileSpreadsheet, exact: false, perm: "erp.read" },
  { to: "/admin/servicios", label: "Servicios", icon: Sparkles, exact: false, perm: "service.read" },
  { to: "/admin/tarifas", label: "Tarifas", icon: Tag, exact: false, perm: "tariff.read" },
  { to: "/admin/notificaciones", label: "Notificaciones", icon: Bell, exact: false, perm: "audit.read" },
  { to: "/admin/auditoria", label: "Auditoría", icon: ShieldCheck, exact: false, perm: "audit.read" },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const permissions = useSession((s) => s.permissions);
  // En demo (sin permisos reales) se muestra todo; con sesión real se respeta el RBAC.
  const items = NAV.filter((i) => !i.perm || permissions.length === 0 || permissions.includes(i.perm));
  return (
    <nav className="flex flex-col gap-1 p-4" aria-label="Navegación admin">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={item.exact ? { exact: true } : undefined}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white bg-white/20 font-medium" }}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell() {
  const { user, logout } = useSession();
  const accessToken = useSession((s) => s.accessToken);
  const navigate = useNavigate();
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "AD";
  const [open, setOpen] = useState(false);

  // Solo con sesión real: sin token, no hay datos que mostrar → al login.
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-full">
      {/* Layout grid for large screens */}
      <div className="lg:grid lg:grid-cols-[248px_1fr] min-h-screen">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col bg-navy min-h-screen sticky top-0">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
            <Brand tone="white" />
          </div>
          <SidebarNav />
        </aside>

        {/* Main column */}
        <div className="flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              {/* Mobile hamburger */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                  className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-ink hover:bg-bg transition-colors"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[248px] bg-navy p-0 border-0">
                  <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
                    <Brand tone="white" />
                  </div>
                  <SidebarNav onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="lg:hidden">
                <Brand />
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-ink">{user?.name ?? "Administrador"}</span>
                          <span className="text-xs text-faint">Admin</span>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate({ to: "/privacidad" })}
                      className="cursor-pointer"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Privacidad y datos
                    </DropdownMenuItem>
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
          <main className={cn("flex-1 px-4 py-6 sm:px-6 max-w-full overflow-x-hidden")}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
