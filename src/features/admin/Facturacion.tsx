import { useState } from "react";
import { useInvoices, usePayouts, useQuickers } from "@/hooks/queries";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cop } from "@/lib/format";
import { Download, Eye, Plus, FileText, Receipt } from "lucide-react";

export default function Facturacion() {
  const { data: invoices, isLoading: invoicesLoading, isError: invoicesError, refetch: invoicesRefetch } = useInvoices();
  const { data: payouts, isLoading: payoutsLoading, isError: payoutsError, refetch: payoutsRefetch } = usePayouts();
  const { data: quickers } = useQuickers();
  const [generating, setGenerating] = useState(false);

  const getQuickerById = (id: string) => quickers?.find((q) => q.id === id);

  const handleDownload = (label: string) => {
    toast.success(`Descargando "${label}"…`);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1000));
    setGenerating(false);
    toast.success("Quincena generada y cuentas de cobro enviadas");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-[var(--font-display)] text-ink">
          Facturación
        </h1>
        <p className="mt-0.5 text-sm text-faint">
          Cuentas de cobro y facturas a clientes
        </p>
      </div>

      {/* Panel 1: Cuentas de cobro · Quickers */}
      <section aria-labelledby="cuentas-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />
            </div>
            <h2
              id="cuentas-title"
              className="text-lg font-semibold text-ink"
            >
              Cuentas de cobro · Quickers
            </h2>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-brand-600 hover:bg-brand-700 text-white shrink-0"
          >
            <Plus className="h-4 w-4" />
            {generating ? "Generando…" : "Generar quincena"}
          </Button>
        </div>

        {payoutsLoading ? (
          <LoadingState rows={3} />
        ) : payoutsError ? (
          <ErrorState onRetry={payoutsRefetch} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-sm" role="table">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Documento</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Periodo</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Quicker</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Valor</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Estado</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {!payouts || payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-faint">
                      No hay cuentas de cobro. Genera una quincena.
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout, idx) => {
                    const quicker = getQuickerById(payout.quickerId);
                    const docNum = `CC-${String(idx + 1001).padStart(4, "0")}`;
                    return (
                      <tr key={payout.id} className="border-b border-line last:border-0 hover:bg-bg/50 transition-colors">
                        <td className="px-4 py-3 align-middle font-mono text-xs text-ink-2">
                          {docNum}
                        </td>
                        <td className="px-4 py-3 align-middle text-ink-2 whitespace-nowrap">
                          {payout.period}
                        </td>
                        <td className="px-4 py-3 align-middle font-medium text-ink">
                          {quicker?.name ?? payout.quickerId}
                        </td>
                        <td className="px-4 py-3 align-middle tabular-nums font-medium text-ink">
                          {cop(payout.net)}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {payout.status === "pagado" ? (
                            <Badge className="bg-success/10 text-success border-0">Pagado</Badge>
                          ) : (
                            <Badge className="bg-warning/15 text-warning border-0">Pendiente</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <button
                            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
                            onClick={() => handleDownload(`${docNum} - ${quicker?.name}`)}
                            aria-label={`Descargar cuenta de cobro ${docNum}`}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Descargar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Panel 2: Facturas · Clientes */}
      <section aria-labelledby="facturas-title">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
            <Receipt className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </div>
          <h2
            id="facturas-title"
            className="text-lg font-semibold text-ink"
          >
            Facturas · Clientes
          </h2>
        </div>

        {invoicesLoading ? (
          <LoadingState rows={3} />
        ) : invoicesError ? (
          <ErrorState onRetry={invoicesRefetch} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[560px] text-sm" role="table">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Número</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Cliente</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Periodo</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Valor</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Estado</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {!invoices || invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-faint">
                      No hay facturas disponibles.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-line last:border-0 hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3 align-middle font-mono text-xs font-medium text-ink">
                        {invoice.number}
                      </td>
                      <td className="px-4 py-3 align-middle font-medium text-ink">
                        {invoice.client}
                      </td>
                      <td className="px-4 py-3 align-middle text-ink-2 whitespace-nowrap">
                        {invoice.period}
                      </td>
                      <td className="px-4 py-3 align-middle tabular-nums font-medium text-ink">
                        {cop(invoice.amount)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {invoice.status === "pagada" ? (
                          <Badge className="bg-success/10 text-success border-0">Pagada</Badge>
                        ) : (
                          <Badge className="bg-warning/15 text-warning border-0">Pendiente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <button
                          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
                          onClick={() => handleDownload(`${invoice.number} - ${invoice.client}`)}
                          aria-label={`Ver factura ${invoice.number}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
