import { Navigate } from "@tanstack/react-router";

// El alta de quickers se hace en la propia lista (/admin/quickers) con su formulario.
export default function CrearQuicker() {
  return <Navigate to="/admin/quickers" replace />;
}
