import { z } from "zod";

export type Role = "client" | "quicker" | "admin";

export const ServiceType = z.enum(["hogar", "profundo", "plomeria", "electricista"]);
export const Frequency = z.enum(["unico", "semanal", "quincenal", "mensual"]);
export const Duration = z.union([z.literal(4), z.literal(6), z.literal(8)]);

export const Service = z.object({
  id: z.string(), type: ServiceType, name: z.string(), desc: z.string(),
  basePrice: z.number(), image: z.string().optional(),
});

export const Booking = z.object({
  id: z.string(), serviceType: ServiceType,
  size: z.enum(["estudio", "1-2", "3+", "casa"]), frequency: Frequency,
  duration: Duration, supplies: z.boolean(), date: z.string(), time: z.string(),
  address: z.string(), notes: z.string().optional(), pets: z.boolean().default(false),
  total: z.number(), status: z.enum(["agendado", "en_curso", "completado", "cancelado"]),
  quickerId: z.string().optional(), rated: z.boolean().default(false),
});

export const Quicker = z.object({
  id: z.string(), name: z.string(), doc: z.string(), phone: z.string(), email: z.string(),
  zone: z.string(), contract: z.enum(["prestacion", "fijo", "indefinido"]),
  hourlyRate: z.number(), status: z.enum(["activo", "inactivo", "incapacidad"]),
  rating: z.number(), monthlyServices: z.number(), avatar: z.string().optional(),
});

export const ServiceAssignment = z.object({
  id: z.string(), bookingId: z.string(), clientName: z.string(), address: z.string(),
  time: z.string(), durationHours: z.number(), payout: z.number(),
  status: z.enum(["proximo", "en_curso", "completado"]),
});

export const Payout = z.object({
  id: z.string(), quickerId: z.string(), period: z.string(), services: z.number(),
  hours: z.number(), gross: z.number(), deductions: z.number(), net: z.number(),
  status: z.enum(["pendiente", "pagado"]),
});

export const Invoice = z.object({
  id: z.string(), number: z.string(), client: z.string(), period: z.string(),
  amount: z.number(), status: z.enum(["pagada", "pendiente"]),
});

export const Rating = z.object({
  id: z.string(), bookingId: z.string(), stars: z.number().min(1).max(5),
  tags: z.array(z.string()), comment: z.string().optional(), tip: z.number().default(0),
});

export const LeaveRequest = z.object({
  id: z.string(), quickerId: z.string(),
  kind: z.enum(["incapacidad", "licencia_remunerada", "licencia_no_remunerada"]),
  reason: z.string(), from: z.string(), to: z.string(), fileName: z.string().optional(),
  status: z.enum(["en_revision", "aprobada", "rechazada"]),
});

export type ServiceType = z.infer<typeof ServiceType>;
export type Frequency = z.infer<typeof Frequency>;
export type Duration = z.infer<typeof Duration>;
export type Service = z.infer<typeof Service>;
export type Booking = z.infer<typeof Booking>;
export type Quicker = z.infer<typeof Quicker>;
export type ServiceAssignment = z.infer<typeof ServiceAssignment>;
export type Payout = z.infer<typeof Payout>;
export type Invoice = z.infer<typeof Invoice>;
export type Rating = z.infer<typeof Rating>;
export type LeaveRequest = z.infer<typeof LeaveRequest>;

export type Kpis = {
  revenue: number; revenueDelta: number; completed: number; completedDelta: number;
  activeQuickers: number; avgRating: number;
  revenueByMonth: { month: string; value: number }[];
  byStatus: { status: string; value: number }[];
  byZone: { zone: string; value: number }[];
};
