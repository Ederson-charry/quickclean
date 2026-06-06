import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatPillProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  className?: string;
}

export function StatPill({ icon: Icon, value, label, className }: StatPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 backdrop-blur-sm",
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-white/80" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold leading-none text-white">{value}</p>
        <p className="mt-0.5 text-xs leading-none text-white/70">{label}</p>
      </div>
    </div>
  );
}
