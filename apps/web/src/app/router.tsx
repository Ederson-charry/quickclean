import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useSession } from "@/stores/session";

// Layout shells (small, load eagerly)
import { ClientShell } from "@/components/layout/ClientShell";
import { QuickerShell } from "@/components/layout/QuickerShell";
import { AdminShell } from "@/components/layout/AdminShell";

// Loading fallback
import { LoadingState } from "@/components/shared/States";

function PageFallback() {
  return (
    <div className="px-4 py-8">
      <LoadingState rows={4} />
    </div>
  );
}

function withSuspense<T extends object>(Component: React.ComponentType<T>) {
  return function SuspenseWrapper(props: T) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Auth screens — lazy
const Login = withSuspense(lazy(() => import("@/features/auth/Login")));
const Registro = withSuspense(lazy(() => import("@/features/auth/Registro")));

// Client screens — lazy
const Home = withSuspense(lazy(() => import("@/features/client/Home")));
const Reservar = withSuspense(lazy(() => import("@/features/client/reservar/Reservar")));
const MisServicios = withSuspense(lazy(() => import("@/features/client/MisServicios")));
const Calificar = withSuspense(lazy(() => import("@/features/client/Calificar")));

// Quicker screens — lazy
const Hoy = withSuspense(lazy(() => import("@/features/quicker/Hoy")));
const DetalleServicio = withSuspense(lazy(() => import("@/features/quicker/DetalleServicio")));
const Balance = withSuspense(lazy(() => import("@/features/quicker/Balance")));
const Solicitudes = withSuspense(lazy(() => import("@/features/quicker/Solicitudes")));
const Perfil = withSuspense(lazy(() => import("@/features/quicker/Perfil")));

// Admin screens — lazy
const Dashboard = withSuspense(lazy(() => import("@/features/admin/Dashboard")));
const Quickers = withSuspense(lazy(() => import("@/features/admin/Quickers")));
const CrearQuicker = withSuspense(lazy(() => import("@/features/admin/CrearQuicker")));
const Pagos = withSuspense(lazy(() => import("@/features/admin/Pagos")));
const Facturacion = withSuspense(lazy(() => import("@/features/admin/Facturacion")));
const Clientes = withSuspense(lazy(() => import("@/features/admin/Clientes")));
const MantenimientoCliente = withSuspense(lazy(() => import("@/features/admin/MantenimientoCliente")));
const Auditoria = withSuspense(lazy(() => import("@/features/admin/Auditoria")));
const Tarifas = withSuspense(lazy(() => import("@/features/admin/Tarifas")));
const Servicios = withSuspense(lazy(() => import("@/features/admin/Servicios")));
const Reservas = withSuspense(lazy(() => import("@/features/admin/Reservas")));
const Asignacion = withSuspense(lazy(() => import("@/features/admin/Asignacion")));

// ─── Root route ───────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  beforeLoad: ({ location }) => {
    const user = useSession.getState().user;
    const publicPaths = ["/login", "/registro"];
    if (!user && !publicPaths.includes(location.pathname)) {
      throw redirect({ to: "/login" });
    }
  },
});

// ─── Auth routes ──────────────────────────────────────────────────────────────
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const registroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registro",
  component: Registro,
});

// ─── Client layout ───────────────────────────────────────────────────────────
const clientLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "client-layout",
  component: ClientShell,
});

const clientHomeRoute = createRoute({
  getParentRoute: () => clientLayoutRoute,
  path: "/app",
  component: Home,
});

const clientReservarRoute = createRoute({
  getParentRoute: () => clientLayoutRoute,
  path: "/app/reservar",
  component: Reservar,
});

const clientServiciosRoute = createRoute({
  getParentRoute: () => clientLayoutRoute,
  path: "/app/servicios",
  component: MisServicios,
});

const clientCalificarRoute = createRoute({
  getParentRoute: () => clientLayoutRoute,
  path: "/app/servicios/$id/calificar",
  component: Calificar,
});

// ─── Quicker layout ───────────────────────────────────────────────────────────
const quickerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "quicker-layout",
  component: QuickerShell,
});

const quickerHoyRoute = createRoute({
  getParentRoute: () => quickerLayoutRoute,
  path: "/pro",
  component: Hoy,
});

const quickerServicioRoute = createRoute({
  getParentRoute: () => quickerLayoutRoute,
  path: "/pro/servicio/$id",
  component: DetalleServicio,
});

const quickerBalanceRoute = createRoute({
  getParentRoute: () => quickerLayoutRoute,
  path: "/pro/balance",
  component: Balance,
});

const quickerSolicitudesRoute = createRoute({
  getParentRoute: () => quickerLayoutRoute,
  path: "/pro/solicitudes",
  component: Solicitudes,
});

const quickerPerfilRoute = createRoute({
  getParentRoute: () => quickerLayoutRoute,
  path: "/pro/perfil",
  component: Perfil,
});

// ─── Admin layout ─────────────────────────────────────────────────────────────
const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "admin-layout",
  component: AdminShell,
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin",
  component: Dashboard,
});

const adminQuickersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/quickers",
  component: Quickers,
});

const adminCrearQuickerRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/quickers/nuevo",
  component: CrearQuicker,
});

const adminPagosRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/pagos",
  component: Pagos,
});

const adminFacturacionRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/facturacion",
  component: Facturacion,
});

const adminClientesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/clientes",
  component: Clientes,
});

const adminNuevoClienteRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/clientes/nuevo",
  component: MantenimientoCliente,
});

const adminEditarClienteRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/clientes/$id",
  component: MantenimientoCliente,
});

const adminAuditoriaRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/auditoria",
  component: Auditoria,
});

const adminTarifasRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/tarifas",
  component: Tarifas,
});

const adminServiciosRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/servicios",
  component: Servicios,
});

const adminReservasRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/reservas",
  component: Reservas,
});

const adminAsignacionRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/asignacion",
  component: Asignacion,
});

// ─── Route tree ───────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  loginRoute,
  registroRoute,
  clientLayoutRoute.addChildren([
    clientHomeRoute,
    clientReservarRoute,
    clientServiciosRoute,
    clientCalificarRoute,
  ]),
  quickerLayoutRoute.addChildren([
    quickerHoyRoute,
    quickerServicioRoute,
    quickerBalanceRoute,
    quickerSolicitudesRoute,
    quickerPerfilRoute,
  ]),
  adminLayoutRoute.addChildren([
    adminDashboardRoute,
    adminQuickersRoute,
    adminCrearQuickerRoute,
    adminPagosRoute,
    adminFacturacionRoute,
    adminClientesRoute,
    adminNuevoClienteRoute,
    adminEditarClienteRoute,
    adminAuditoriaRoute,
    adminTarifasRoute,
    adminServiciosRoute,
    adminReservasRoute,
    adminAsignacionRoute,
  ]),
]);

// BASE_URL is "/quickclean/" in the GitHub Pages build and "/" in dev.
const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export const router = createRouter({ routeTree, basepath });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
