import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateBooking } from "@/hooks/queries";
import { useCreateReservation } from "@/hooks/catalog";
import { mapFrequency, mapSize, useBookingPrice } from "@/hooks/bookingPrice";
import { useBooking } from "@/stores/booking";
import { useSession } from "@/stores/session";
import { cop } from "@/lib/format";
import { Loader2, CreditCard, Building2, Smartphone, Wallet } from "lucide-react";
import type { Booking } from "@/mocks/types";
import { toast } from "sonner";

interface PaymentStepProps {
  onSuccess: (booking: Booking) => void;
}

export function PaymentStep({ onSuccess }: PaymentStepProps) {
  const { data } = useBooking();
  const price = useBookingPrice(data);
  const createBooking = useCreateBooking();
  const createReservation = useCreateReservation();
  const accessToken = useSession((s) => s.accessToken);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<"tarjeta" | "pse" | "nequi" | "breb">("tarjeta");

  // Card fields (visual only)
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");

  async function handlePay() {
    setPaying(true);
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    const time = data.time ?? "08:00";
    const address = data.address ?? "Sin dirección";
    try {
      // Camino real: categoría del catálogo + sesión autenticada → POST /reservas
      if (data.serviceCategoryId && accessToken) {
        const real = await createReservation.mutateAsync({
          serviceCategoryId: data.serviceCategoryId,
          duration: data.duration,
          frequency: mapFrequency(data.frequency),
          size: mapSize(data.size),
          supplies: data.supplies,
          scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
          address,
          notes: data.notes,
          pets: data.pets ?? false,
        });
        toast.success("¡Reserva creada con éxito!");
        onSuccess({
          id: real.id,
          serviceType: data.serviceType ?? "hogar",
          size: data.size ?? "1-2",
          frequency: data.frequency,
          duration: data.duration,
          supplies: data.supplies,
          date,
          time,
          address,
          notes: data.notes,
          pets: data.pets ?? false,
          total: real.priceTotal,
          status: "agendado",
          rated: false,
        });
        return;
      }

      // Camino demo (sin backend/sesión): mock
      const booking = await createBooking.mutateAsync({
        serviceType: data.serviceType ?? "hogar",
        size: data.size ?? "1-2",
        frequency: data.frequency,
        duration: data.duration,
        supplies: data.supplies,
        date,
        time,
        address,
        notes: data.notes,
        pets: data.pets ?? false,
        total: price.total,
      });
      toast.success("¡Pago procesado con éxito!");
      onSuccess(booking);
    } catch {
      toast.error("Error procesando el pago. Intenta de nuevo.");
      setPaying(false);
    }
  }

  // Format card number with spaces
  function formatCardNum(val: string) {
    return val
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  // Format MM/YY
  function formatExpiry(val: string) {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-ink mb-1">Método de pago</h2>
        <p className="text-sm text-faint">Entorno de demo — no se realizan cobros reales</p>
      </div>

      <Tabs value={method} onValueChange={(v) => setMethod(v as typeof method)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="tarjeta" className="text-xs gap-1">
            <CreditCard className="h-3.5 w-3.5" />
            Tarjeta
          </TabsTrigger>
          <TabsTrigger value="pse" className="text-xs gap-1">
            <Building2 className="h-3.5 w-3.5" />
            PSE
          </TabsTrigger>
          <TabsTrigger value="nequi" className="text-xs gap-1">
            <Smartphone className="h-3.5 w-3.5" />
            Nequi
          </TabsTrigger>
          <TabsTrigger value="breb" className="text-xs gap-1">
            <Wallet className="h-3.5 w-3.5" />
            Bre-B
          </TabsTrigger>
        </TabsList>

        {/* Tarjeta */}
        <TabsContent value="tarjeta" className="space-y-4 mt-4">
          {/* Visual card preview */}
          <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white space-y-4">
            <div className="flex justify-between items-start">
              <div className="text-xs opacity-70 uppercase tracking-widest">QuickClean Pay</div>
              <CreditCard className="h-6 w-6 opacity-80" />
            </div>
            <p className="font-mono text-lg tracking-widest">
              {cardNum || "•••• •••• •••• ••••"}
            </p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs opacity-70">Titular</p>
                <p className="font-medium text-sm uppercase">{cardName || "NOMBRE APELLIDO"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70">Vence</p>
                <p className="font-medium text-sm">{expiry || "MM/YY"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="card-number">Número de tarjeta</Label>
              <Input
                id="card-number"
                placeholder="1234 5678 9012 3456"
                value={cardNum}
                onChange={(e) => setCardNum(formatCardNum(e.target.value))}
                maxLength={19}
                autoComplete="cc-number"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-name">Nombre del titular</Label>
              <Input
                id="card-name"
                placeholder="Como aparece en la tarjeta"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                autoComplete="cc-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="card-expiry">Vencimiento</Label>
                <Input
                  id="card-expiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  autoComplete="cc-exp"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card-cvv">CVV</Label>
                <Input
                  id="card-cvv"
                  placeholder="•••"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  type="password"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* PSE */}
        <TabsContent value="pse" className="mt-4">
          <div className="rounded-xl border border-line bg-surface p-6 text-center space-y-2">
            <Building2 className="h-10 w-10 mx-auto text-brand-600" />
            <p className="font-medium text-ink">Débito PSE</p>
            <p className="text-sm text-faint">Serás redirigido al portal de tu banco (simulado)</p>
          </div>
        </TabsContent>

        {/* Nequi */}
        <TabsContent value="nequi" className="mt-4">
          <div className="rounded-xl border border-line bg-surface p-6 text-center space-y-3">
            <Smartphone className="h-10 w-10 mx-auto text-violet-600" />
            <p className="font-medium text-ink">Pagar con Nequi</p>
            <div className="space-y-1.5">
              <Label htmlFor="nequi-phone">Número Nequi</Label>
              <Input id="nequi-phone" placeholder="+57 300 000 0000" inputMode="tel" />
            </div>
          </div>
        </TabsContent>

        {/* Bre-B */}
        <TabsContent value="breb" className="mt-4">
          <div className="rounded-xl border border-line bg-surface p-6 text-center space-y-2">
            <Wallet className="h-10 w-10 mx-auto text-emerald-600" />
            <p className="font-medium text-ink">Bre-B</p>
            <p className="text-sm text-faint">Pago instantáneo vía billetera digital (simulado)</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Pay button */}
      <div className="border-t border-line pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-faint">Total a pagar</span>
          <span className="text-lg font-bold text-brand-600">{cop(price.total)}</span>
        </div>

        <Button
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold h-12"
          onClick={handlePay}
          disabled={paying}
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Procesando pago...
            </>
          ) : (
            `Pagar ${cop(price.total)}`
          )}
        </Button>

        <p className="text-center text-xs text-faint">
          🔒 Pago 100% seguro · Cifrado SSL
        </p>
      </div>
    </div>
  );
}
