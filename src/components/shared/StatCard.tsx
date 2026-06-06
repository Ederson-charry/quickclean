import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  delta?: number;
  iconColor?: string;
}

export function StatCard({ icon: Icon, value, label, delta, iconColor = "text-brand-600" }: StatCardProps) {
  const isPositive = delta !== undefined && delta >= 0;
  const isNegative = delta !== undefined && delta < 0;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <Icon className={cn("h-5 w-5", iconColor)} aria-hidden="true" />
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              isPositive && "bg-success/10 text-success",
              isNegative && "bg-danger/10 text-danger",
            )}
            aria-label={`Variación: ${delta > 0 ? "+" : ""}${delta}%`}
          >
            {delta > 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold font-[var(--font-display)] text-ink leading-tight">
          {value}
        </p>
        <p className="mt-0.5 text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
