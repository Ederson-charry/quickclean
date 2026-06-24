import { format } from "date-fns";
import { es } from "date-fns/locale";

export const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export const fechaCorta = (iso: string) => format(new Date(iso), "d 'de' MMM", { locale: es });
export const fechaLarga = (iso: string) => format(new Date(iso), "EEEE d 'de' MMMM", { locale: es });
