import { Link } from "@tanstack/react-router";
import { useSession } from "@/stores/session";
import { Logo } from "./Logo";

/** Logo de marca enlazado al home del rol activo. `tone="white"` para fondos oscuros. */
export function Brand({ tone = "color", height = 34 }: { tone?: "color" | "white"; height?: number }) {
  const { role } = useSession();
  const home = role === "admin" ? "/admin" : role === "quicker" ? "/pro" : "/app";
  return (
    <Link to={home} aria-label="QuickClean — inicio" className="inline-flex items-center no-underline">
      <Logo height={height} className={tone === "white" ? "text-white" : "text-brand-600"} />
    </Link>
  );
}
