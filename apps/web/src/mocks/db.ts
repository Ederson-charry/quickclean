import type { Quicker, Kpis, Rating, LeaveRequest, Service, Booking, ServiceAssignment, Payout, Invoice, Client } from "./types";
import { bookingTotal, quickerPayout } from "@/lib/pricing";

// ── Quickers ──────────────────────────────────────────────────────────────────

const diana: Quicker = {
  id: "q1", name: "Diana Rojas", doc: "1.010.234.567", phone: "+57 311 456 7890",
  email: "diana.rojas@quickclean.co", zone: "Engativá", contract: "indefinido",
  hourlyRate: 13000, status: "activo", rating: 5.0, monthlyServices: 45,
};

const carolina: Quicker = {
  id: "q2", name: "Carolina Méndez", doc: "1.020.345.678", phone: "+57 300 123 4567",
  email: "carolina@quickclean.co", zone: "Chapinero", contract: "fijo", hourlyRate: 12000,
  status: "activo", rating: 4.9, monthlyServices: 42,
};

const jorge: Quicker = {
  id: "q3", name: "Jorge Patiño", doc: "1.030.456.789", phone: "+57 312 789 0123",
  email: "jorge.patino@quickclean.co", zone: "Suba", contract: "prestacion",
  hourlyRate: 11500, status: "activo", rating: 4.7, monthlyServices: 38,
};

const andres: Quicker = {
  id: "q4", name: "Andrés Gómez", doc: "1.040.567.890", phone: "+57 318 234 5678",
  email: "andres.gomez@quickclean.co", zone: "Kennedy", contract: "prestacion",
  hourlyRate: 11000, status: "activo", rating: 4.6, monthlyServices: 31,
};

const luisa: Quicker = {
  id: "q5", name: "Luisa Fernanda Gil", doc: "1.050.678.901", phone: "+57 320 345 6789",
  email: "luisa.gil@quickclean.co", zone: "Usaquén", contract: "fijo",
  hourlyRate: 12500, status: "incapacidad", rating: 4.8, monthlyServices: 0,
};

const marcela: Quicker = {
  id: "q6", name: "Marcela Ríos", doc: "1.060.789.012", phone: "+57 314 567 8901",
  email: "marcela.rios@quickclean.co", zone: "Chapinero", contract: "prestacion",
  hourlyRate: 11000, status: "inactivo", rating: 4.5, monthlyServices: 0,
};

// ── Services ──────────────────────────────────────────────────────────────────

const services: Service[] = [
  {
    id: "s1", type: "hogar", name: "Aseo de Hogar", desc: "Limpieza general de espacios residenciales: sala, habitaciones, cocina y baños.",
    basePrice: 109900,
  },
  {
    id: "s2", type: "profundo", name: "Aseo Profundo", desc: "Limpieza intensiva incluyendo interiores de electrodomésticos, ventanas y zonas de difícil acceso.",
    basePrice: 139900,
  },
  {
    id: "s3", type: "plomeria", name: "Plomería Express", desc: "Reparación de fugas, cambio de llaves y mantenimiento de tuberías en el hogar.",
    basePrice: 79900,
  },
  {
    id: "s4", type: "electricista", name: "Electricista", desc: "Instalación y reparación de tomas, interruptores, lámparas y revisión del tablero.",
    basePrice: 79900,
  },
];

// ── Bookings ──────────────────────────────────────────────────────────────────

const bookings: Booking[] = [
  {
    // 1: agendado - Jue 12 jun 2026, 6h, Carolina
    id: "b1", serviceType: "hogar", size: "1-2", frequency: "unico",
    duration: 6, supplies: false, date: "2026-06-12", time: "08:00",
    address: "Cra 7 # 45-10, Chapinero, Bogotá", notes: "Portón azul, piso 3",
    pets: false, total: bookingTotal({ duration: 6, frequency: "unico", supplies: false }),
    status: "agendado", quickerId: "q2", rated: false,
  },
  {
    // 2: completado - 5 jun, pendiente por calificar
    id: "b2", serviceType: "hogar", size: "estudio", frequency: "unico",
    duration: 4, supplies: false, date: "2026-06-05", time: "09:00",
    address: "Calle 85 # 11-38, Chapinero Alto, Bogotá",
    pets: false, total: bookingTotal({ duration: 4, frequency: "unico", supplies: false }),
    status: "completado", quickerId: "q1", rated: false,
  },
  {
    // 3: completado y calificado
    id: "b3", serviceType: "profundo", size: "3+", frequency: "mensual",
    duration: 8, supplies: true, date: "2026-05-20", time: "07:30",
    address: "Av. Chile # 9-20, Teusaquillo, Bogotá", notes: "Dejar llave con portería",
    pets: true, total: bookingTotal({ duration: 8, frequency: "mensual", supplies: true }),
    status: "completado", quickerId: "q2", rated: true,
  },
];

// ── ServiceAssignments (Carolina's today) ─────────────────────────────────────

const assignments: ServiceAssignment[] = [
  {
    id: "a1", bookingId: "b1", clientName: "Laura Gómez", address: "Cra 7 # 45-10, Chapinero",
    time: "08:00", durationHours: 6, payout: quickerPayout({ duration: 6, frequency: "unico" }),
    status: "proximo",
  },
  {
    id: "a2", bookingId: "bx1", clientName: "Claudia Mora", address: "Calle 72 # 5-83, Chapinero",
    time: "10:30", durationHours: 4, payout: quickerPayout({ duration: 4, frequency: "unico" }),
    status: "en_curso",
  },
  {
    id: "a3", bookingId: "bx2", clientName: "Roberto Suárez", address: "Cra 13 # 93-40, Chapinero Norte",
    time: "07:00", durationHours: 6, payout: quickerPayout({ duration: 6, frequency: "quincenal" }),
    status: "completado",
  },
  {
    id: "a4", bookingId: "bx3", clientName: "Natalia Ospina", address: "Calle 67 # 8-61, Chapinero",
    time: "14:00", durationHours: 8, payout: quickerPayout({ duration: 8, frequency: "unico" }),
    status: "proximo",
  },
  {
    id: "a5", bookingId: "bx4", clientName: "Mariana Castro", address: "Cra 9 # 77-12, Chapinero Alto",
    time: "15:30", durationHours: 4, payout: quickerPayout({ duration: 4, frequency: "mensual" }),
    status: "proximo",
  },
];

// ── Balance (Carolina's wallet) ───────────────────────────────────────────────

const todayEarned = quickerPayout({ duration: 6, frequency: "unico" }) + quickerPayout({ duration: 4, frequency: "unico" });
const weekEarned = todayEarned * 3;

const balance = {
  available: Math.round(weekEarned * 1.5),
  today: todayEarned,
  week: weekEarned,
  history: [
    { label: "Aseo Hogar · Laura Gómez", amount: quickerPayout({ duration: 6, frequency: "unico" }), kind: "ingreso" },
    { label: "Aseo Hogar · Claudia Mora", amount: quickerPayout({ duration: 4, frequency: "unico" }), kind: "ingreso" },
    { label: "Aseo Profundo · Roberto Suárez", amount: quickerPayout({ duration: 6, frequency: "quincenal" }), kind: "ingreso" },
    { label: "Retiro a cuenta Bancolombia", amount: -200000, kind: "retiro" },
    { label: "Incapacidad 3–5 jun", amount: -45000, kind: "descuento" },
  ] as { label: string; amount: number; kind: string }[],
};

// ── Payouts (5 entries, nets 0.7M–3.2M, ~7% comisión) ───────────────────────

const payouts: Payout[] = [
  {
    // Carolina: 10 services × 6h unico → quicker gross = 10 × 76930
    id: "pay1", quickerId: "q2", period: "1–15 Jun 2026", services: 10, hours: 60,
    gross: 10 * quickerPayout({ duration: 6, frequency: "unico" }),
    deductions: Math.round(10 * quickerPayout({ duration: 6, frequency: "unico" }) * 0.07),
    net: Math.round(10 * quickerPayout({ duration: 6, frequency: "unico" }) * 0.93),
    status: "pendiente",
  },
  {
    // Diana: 16 services × 6h unico
    id: "pay2", quickerId: "q1", period: "1–15 Jun 2026", services: 16, hours: 96,
    gross: 16 * quickerPayout({ duration: 6, frequency: "unico" }),
    deductions: Math.round(16 * quickerPayout({ duration: 6, frequency: "unico" }) * 0.07),
    net: Math.round(16 * quickerPayout({ duration: 6, frequency: "unico" }) * 0.93),
    status: "pagado",
  },
  {
    // Jorge: 20 services × 8h mensual
    id: "pay3", quickerId: "q3", period: "1–15 Jun 2026", services: 20, hours: 160,
    gross: 20 * quickerPayout({ duration: 8, frequency: "mensual" }),
    deductions: Math.round(20 * quickerPayout({ duration: 8, frequency: "mensual" }) * 0.07),
    net: Math.round(20 * quickerPayout({ duration: 8, frequency: "mensual" }) * 0.93),
    status: "pendiente",
  },
  {
    // Carolina (prev period): 35 services × 8h unico → ~3.2M net
    id: "pay4", quickerId: "q2", period: "16–31 May 2026", services: 35, hours: 280,
    gross: 35 * quickerPayout({ duration: 8, frequency: "unico" }),
    deductions: Math.round(35 * quickerPayout({ duration: 8, frequency: "unico" }) * 0.07),
    net: Math.round(35 * quickerPayout({ duration: 8, frequency: "unico" }) * 0.93),
    status: "pagado",
  },
  {
    // Andrés: 10 services × 6h unico → ~0.7M net
    id: "pay5", quickerId: "q4", period: "1–15 Jun 2026", services: 10, hours: 60,
    gross: 10 * quickerPayout({ duration: 6, frequency: "unico" }),
    deductions: Math.round(10 * quickerPayout({ duration: 6, frequency: "unico" }) * 0.07),
    net: Math.round(10 * quickerPayout({ duration: 6, frequency: "unico" }) * 0.93),
    status: "pendiente",
  },
];

// ── Invoices (spec §10 exact) ─────────────────────────────────────────────────

const invoices: Invoice[] = [
  {
    id: "inv1", number: "FE-001245", client: "Conjunto Altos del Parque",
    period: "May 2026", amount: 8_640_000, status: "pagada",
  },
  {
    id: "inv2", number: "FE-001246", client: "Inmobiliaria Bonanza",
    period: "May 2026", amount: 5_220_000, status: "pendiente",
  },
  {
    id: "inv3", number: "FE-001247", client: "Ana López",
    period: "Jun 2026", amount: bookingTotal({ duration: 6, frequency: "unico", supplies: false }),
    status: "pagada",
  },
];

// ── Clients ───────────────────────────────────────────────────────────────────

const clients: Client[] = [
  {
    id: "c1", name: "Laura Gómez", doc: "1.012.345.678",
    email: "laura.gomez@gmail.com", phone: "+57 311 234 5678",
    address: "Cra 7 # 45-10, Chapinero", city: "Bogotá",
    type: "persona", status: "activo", bookingsCount: 8, totalSpent: 1_240_000,
  },
  {
    id: "c2", name: "Ana López", doc: "1.023.456.789",
    email: "ana.lopez@gmail.com", phone: "+57 312 345 6789",
    address: "Calle 85 # 11-38, Chapinero Alto", city: "Bogotá",
    type: "persona", status: "activo", bookingsCount: 12, totalSpent: 1_870_000,
  },
  {
    id: "c3", name: "Conjunto Altos del Parque", doc: "900.123.456-1",
    email: "admin@altosdelparque.co", phone: "+57 601 789 0123",
    address: "Cra 19 # 95-20, Usaquén", city: "Bogotá",
    type: "empresa", status: "activo", bookingsCount: 64, totalSpent: 8_640_000,
  },
  {
    id: "c4", name: "Inmobiliaria Bonanza", doc: "800.456.789-2",
    email: "servicios@bonanza.com.co", phone: "+57 601 345 6789",
    address: "Av. El Dorado # 68C-61, Fontibón", city: "Bogotá",
    type: "empresa", status: "activo", bookingsCount: 38, totalSpent: 5_220_000,
  },
  {
    id: "c5", name: "Claudia Mora", doc: "1.034.567.890",
    email: "claudia.mora@gmail.com", phone: "+57 300 456 7890",
    address: "Calle 72 # 5-83, Chapinero", city: "Bogotá",
    type: "persona", status: "activo", bookingsCount: 5, totalSpent: 750_000,
  },
  {
    id: "c6", name: "Constructora Habitat SAS", doc: "901.234.567-3",
    email: "operaciones@habitat.co", phone: "+57 601 567 8901",
    address: "Cra 50 # 26-20, Puente Aranda", city: "Bogotá",
    type: "empresa", status: "inactivo", bookingsCount: 15, totalSpent: 2_100_000,
  },
  {
    id: "c7", name: "Roberto Suárez", doc: "1.045.678.901",
    email: "roberto.suarez@gmail.com", phone: "+57 318 678 9012",
    address: "Cra 13 # 93-40, Chapinero Norte", city: "Bogotá",
    type: "persona", status: "activo", bookingsCount: 3, totalSpent: 450_000,
  },
];

// ── KPIs ──────────────────────────────────────────────────────────────────────

const kpis: Kpis = {
  revenue: 236_400_000, revenueDelta: 12, completed: 1284, completedDelta: 8,
  activeQuickers: 48, avgRating: 4.8,
  revenueByMonth: [
    { month: "Ene", value: 180 }, { month: "Feb", value: 195 }, { month: "Mar", value: 210 },
    { month: "Abr", value: 205 }, { month: "May", value: 228 }, { month: "Jun", value: 236 },
  ],
  byStatus: [
    { status: "Completados", value: 1284 }, { status: "En curso", value: 36 }, { status: "Cancelados", value: 18 },
  ],
  byZone: [
    { zone: "Chapinero", value: 320 }, { zone: "Suba", value: 240 },
    { zone: "Engativá", value: 190 }, { zone: "Kennedy", value: 150 },
  ],
};

// ── DB export ─────────────────────────────────────────────────────────────────

export const db = {
  services,
  quickers: [diana, carolina, jorge, andres, luisa, marcela],
  bookings,
  assignments,
  balance,
  payouts,
  invoices,
  clients,
  ratings: [] as Rating[],
  leaveRequests: [] as LeaveRequest[],
  kpis,
};
