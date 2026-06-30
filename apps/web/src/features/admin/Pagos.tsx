import { CreditCard } from "lucide-react";

export default function Pagos() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight text-ink">Pagos</h1>
        <p className="mt-1 text-sm text-ink-2">Conciliación de pagos en línea de los servicios.</p>
      </header>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-50">
          <CreditCard className="size-7 text-brand-600" />
        </div>
        <h2 className="font-semibold text-ink">Módulo en construcción</h2>
        <p className="max-w-md text-sm text-ink-2">
          La pasarela de pagos (Openpay) está en desarrollo. Cuando esté integrada, aquí verás las transacciones reales
          y la conciliación de cobros. Por ahora no hay datos que mostrar.
        </p>
      </div>
    </div>
  );
}
