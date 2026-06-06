import { useBooking } from "@/stores/booking";
import { Stepper } from "@/components/shared/Stepper";
import { PriceSummary } from "@/components/shared/PriceSummary";
import { Button } from "@/components/ui/button";
import { Step1Tipo } from "./Step1Tipo";
import { Step2Frecuencia } from "./Step2Frecuencia";
import { Step3Duracion } from "./Step3Duracion";
import { Step4FechaDireccion } from "./Step4FechaDireccion";
import { Step5Resumen } from "./Step5Resumen";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

function isStepValid(step: number, data: ReturnType<typeof useBooking>["data"]): boolean {
  switch (step) {
    case 1:
      return !!data.serviceType && !!data.size;
    case 2:
      return !!data.frequency;
    case 3:
      return !!data.duration;
    case 4:
      return !!data.date && !!data.time && !!data.address?.trim();
    case 5:
      return true;
    default:
      return false;
  }
}

const STEP_COMPONENTS: Record<number, React.FC> = {
  1: Step1Tipo,
  2: Step2Frecuencia,
  3: Step3Duracion,
  4: Step4FechaDireccion,
  5: Step5Resumen,
};

export default function Reservar() {
  const { step, data, next, back } = useBooking();
  const navigate = useNavigate();
  const StepComponent = STEP_COMPONENTS[step];
  const valid = isStepValid(step, data);

  function handleBack() {
    if (step === 1) {
      navigate({ to: "/app" });
    } else {
      back();
    }
  }

  // Step 5 manages its own Next (payment)
  const isLastStep = step === 5;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-bold text-ink mb-4">
          Agendar servicio
        </h1>
        <Stepper current={step} total={5} />
      </div>

      {/* Two-column layout on md+: form | sticky price */}
      <div className="grid md:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Step content */}
        <div className="rounded-xl border border-line bg-surface p-5 md:p-6">
          <StepComponent />
        </div>

        {/* Sticky price summary */}
        <div className="md:sticky md:top-24">
          <PriceSummary
            duration={data.duration}
            frequency={data.frequency}
            supplies={data.supplies}
          />
        </div>
      </div>

      {/* Footer nav (only for steps 1–4) */}
      {!isLastStep && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            className="gap-2 border-line"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Cancelar" : "Atrás"}
          </Button>

          <Button
            onClick={next}
            disabled={!valid}
            className="gap-2 bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Back button for step 5 */}
      {isLastStep && (
        <div className="flex items-center pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            className="gap-2 border-line"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </Button>
        </div>
      )}
    </div>
  );
}
