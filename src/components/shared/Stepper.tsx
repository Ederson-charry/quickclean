import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEP_LABELS = ["Tipo", "Frecuencia", "Duración", "Fecha", "Resumen"];

interface StepperProps {
  current: number; // 1-based
  total?: number;
}

export function Stepper({ current, total = 5 }: StepperProps) {
  return (
    <nav aria-label="Progreso del wizard" className="w-full">
      <ol className="flex items-center justify-between w-full">
        {Array.from({ length: total }).map((_, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;

          return (
            <li key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    done && "border-brand-600 bg-brand-600 text-white",
                    active && "border-brand-600 bg-white text-brand-600",
                    !done && !active && "border-line bg-bg text-muted",
                  )}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Paso ${step}: ${STEP_LABELS[i]}${done ? " (completado)" : active ? " (actual)" : ""}`}
                >
                  {done ? <Check className="h-4 w-4" /> : step}
                </div>
                <span
                  className={cn(
                    "hidden sm:block text-xs transition-colors",
                    active ? "text-brand-600 font-medium" : done ? "text-ink-2" : "text-muted",
                  )}
                >
                  {STEP_LABELS[i]}
                </span>
              </div>

              {/* Connector */}
              {step < total && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    done ? "bg-brand-600" : "bg-line",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
