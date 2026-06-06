import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { useSession } from "@/stores/session";

// Layout shells
import { ClientShell } from "@/components/layout/ClientShell";
import { QuickerShell } from "@/components/layout/QuickerShell";
import { AdminShell } from "@/components/layout/AdminShell";

// Auth screens
import Login from "@/features/auth/Login";
import Registro from "@/features/auth/Registro";

// Client screens
import Home from "@/features/client/Home";
import Reservar from "@/features/client/reservar/Reservar";
import MisServicios from "@/features/client/MisServicios";
import Calificar from "@/features/client/Calificar";

// Quicker screens
import Hoy from "@/features/quicker/Hoy";
import DetalleServicio from "@/features/quicker/DetalleServicio";
import Balance from "@/features/quicker/Balance";
import Solicitudes from "@/features/quicker/Solicitudes";
import Perfil from "@/features/quicker/Perfil";

// Admin screens
import Dashboard from "@/features/admin/Dashboard";
import Quickers from "@/features/admin/Quickers";
import CrearQuicker from "@/features/admin/CrearQuicker";
import Pagos from "@/features/admin/Pagos";
import Facturacion from "@/features/admin/Facturacion";

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
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
