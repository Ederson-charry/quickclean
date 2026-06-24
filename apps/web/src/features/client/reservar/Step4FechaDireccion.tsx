import { useState } from "react";
import { useBooking } from "@/stores/booking";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  "07:00", "08:00", "09:00", "10:00",
  "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00",
];

export function Step4FechaDireccion() {
  const { data, set } = useBooking();
  const [calOpen, setCalOpen] = useState(false);
  const selectedDate = data.date ? new Date(data.date + "T12:00:00") : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-ink mb-1">Fecha y dirección</h2>
        <p className="text-sm text-faint">Escoge cuándo y dónde</p>
      </div>

      {/* Date picker */}
      <div className="space-y-2">
        <Label>Fecha del servicio</Label>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger
            className={cn(
              "inline-flex w-full items-center justify-start gap-2 rounded-lg border border-line bg-background px-3 py-2 text-sm text-left font-normal transition-colors hover:bg-muted",
              !selectedDate && "text-faint",
            )}
            aria-label="Seleccionar fecha"
          >
            <CalendarIcon className="h-4 w-4 text-faint shrink-0" />
            {selectedDate
              ? format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })
              : "Seleccionar fecha"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  set({ date: format(date, "yyyy-MM-dd") });
                  setCalOpen(false);
                }
              }}
              disabled={(date) => date < new Date()}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time slots */}
      <div className="space-y-2">
        <Label id="time-label" className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-faint" aria-hidden="true" />
          Horario
        </Label>
        <div className="grid grid-cols-5 gap-2" role="group" aria-labelledby="time-label">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => set({ time: slot })}
              aria-pressed={data.time === slot}
              aria-label={`Horario ${slot}`}
              className={cn(
                "rounded-lg border-2 py-2 min-h-[40px] text-center text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                data.time === slot
                  ? "border-brand-600 bg-brand-50 text-brand-700 font-semibold"
                  : "border-line bg-surface text-ink-2 hover:border-brand-300",
              )}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          placeholder="Cra 7 # 45-10, Chapinero, Bogotá"
          value={data.address ?? ""}
          onChange={(e) => set({ address: e.target.value })}
          className="border-line"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas adicionales (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Ej: Portón azul, piso 3, código de acceso..."
          value={data.notes ?? ""}
          onChange={(e) => set({ notes: e.target.value })}
          className="border-line resize-none"
          rows={3}
        />
      </div>

      {/* Pets toggle */}
      <div className="rounded-xl border border-line bg-surface p-4 flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="pets-toggle" className="font-medium text-ink cursor-pointer">
            Hay mascotas en el hogar
          </Label>
          <p className="text-sm text-faint mt-0.5">
            Informamos al Quicker para equipamiento adecuado
          </p>
        </div>
        <Switch
          id="pets-toggle"
          checked={data.pets ?? false}
          onCheckedChange={(checked) => set({ pets: checked })}
          aria-label="Hay mascotas"
        />
      </div>
    </div>
  );
}
