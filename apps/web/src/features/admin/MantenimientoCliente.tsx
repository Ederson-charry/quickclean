import { Navigate } from "@tanstack/react-router";

// El alta/edición de clientes se hace en la propia lista (/admin/clientes).
export default function MantenimientoCliente() {
  return <Navigate to="/admin/clientes" replace />;
}
