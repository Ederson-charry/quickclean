import logoUrl from "@/assets/logo-blanco.svg";

const RATIO = 103 / 60; // ancho / alto del SVG original

/**
 * Logo oficial de QuickClean. El SVG es de un solo color; lo recoloreamos con
 * `currentColor` vía CSS mask, así sirve en azul (sobre fondos claros) y en
 * blanco (sobre el sidebar navy / paneles azules) según el `text-*` que reciba.
 */
export function Logo({ height = 36, className = "" }: { height?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="QuickClean"
      className={className}
      style={{
        display: "inline-block",
        height,
        width: height * RATIO,
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${logoUrl})`,
        maskImage: `url(${logoUrl})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}
