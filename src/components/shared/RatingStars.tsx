import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = ["", "Regular", "Bueno", "Muy bueno", "Excelente", "¡Excelente!"];

interface RatingStarsProps {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function RatingStars({
  value,
  onChange,
  readOnly = false,
  size = "md",
  showLabel = false,
}: RatingStarsProps) {
  const [hovered, setHovered] = useState(0);

  const sizeClass = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" }[size];
  const active = hovered || value;

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center gap-1"
        role={readOnly ? undefined : "group"}
        aria-label={readOnly ? `Calificación: ${value} de 5 estrellas` : "Calificación"}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            onKeyDown={(e) => {
              if (readOnly) return;
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange?.(Math.min(5, star + 1));
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange?.(Math.max(1, star - 1));
              }
            }}
            aria-label={`${star} estrella${star !== 1 ? "s" : ""}`}
            aria-pressed={!readOnly ? value === star : undefined}
            className={cn(
              "transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 rounded",
              !readOnly && "hover:scale-110 cursor-pointer",
              readOnly && "cursor-default",
            )}
          >
            <Star
              className={cn(
                sizeClass,
                "transition-colors",
                star <= active
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-muted",
              )}
            />
          </button>
        ))}
      </div>
      {showLabel && !readOnly && (
        <p className="text-sm font-medium text-brand-600 h-5">
          {active > 0 ? LABELS[active] : ""}
        </p>
      )}
    </div>
  );
}
