import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Brand() {
  return (
    <Link to="/app" className="flex items-center gap-2 no-underline">
      <Sparkles className="h-5 w-5 text-brand-600" />
      <span className="font-[var(--font-display)] text-lg font-bold text-brand-600 tracking-tight">
        QuickClean
      </span>
    </Link>
  );
}
