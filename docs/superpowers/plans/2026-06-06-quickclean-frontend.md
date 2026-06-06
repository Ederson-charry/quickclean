# QuickClean Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a navigable, mock-data SPA that demonstrates the three complete QuickClean roles (Cliente · Quicker · Admin) with a modern/minimalist UI and 1-click role switching, ready to swap a real backend by replacing `src/mocks/api.ts`.

**Architecture:** React 19 SPA. UI → TanStack Query hooks → `src/mocks/api.ts` (fake API with simulated latency) → `src/mocks/db.ts` (in-memory mutable seeds). Global state (active role, booking wizard) in Zustand. All data models are Zod schemas in `src/mocks/types.ts`. Three role shells (Client/Quicker mobile-first, Admin dashboard) share a persistent `RoleSwitcher`. Pure logic (pricing, mutations, formatters) is unit-tested with Vitest; screens are verified by running the app.

**Tech Stack:** React 19 · TypeScript (strict) · Vite 6 · Tailwind CSS v4 · shadcn/ui (Radix) · TanStack Router/Query/Table · Zustand · Zod · React Hook Form · Recharts · lucide-react · date-fns · Vitest + Testing Library.

**Reference docs (in repo):**
- Spec: `docs/superpowers/specs/2026-06-06-quickclean-frontend-design.md`
- BUILD doc (per-screen detail in §9, models in §5, components in §10): `QuickClean-Frontend-Build.md`

**Conventions for every task:** import alias `@/` → `src/`. Money via `cop()` from `@/lib/format`. Currency is COP. Locale `es`. After each task that leaves the app runnable, `npm run dev` and confirm the screen renders before committing.

---

## Phase 0 — Bootstrap

### Task 0.1: Scaffold Vite + React 19 + TS (strict)

**Files:**
- Create: project root files (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`)

- [ ] **Step 1: Scaffold**

```bash
npm create vite@latest . -- --template react-ts
npm install
```
If the directory is non-empty, choose "Ignore files and continue".

- [ ] **Step 2: Enable strict TS + `@/` alias**

In `tsconfig.json` set `"strict": true` and add under `compilerOptions`:
```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```

In `vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

- [ ] **Step 3: Verify dev server boots**

Run: `npm run dev`
Expected: Vite serves on localhost with no errors. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react19 ts strict"
```

### Task 0.2: Tailwind v4 + brand tokens + fonts

**Files:**
- Create: `src/styles/globals.css`
- Modify: `vite.config.ts`, `src/main.tsx`

- [ ] **Step 1: Install Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/vite
npm install @fontsource/bricolage-grotesque @fontsource/hanken-grotesk
```

- [ ] **Step 2: Add the Tailwind Vite plugin**

In `vite.config.ts` add `import tailwindcss from "@tailwindcss/vite";` and include `tailwindcss()` in `plugins`.

- [ ] **Step 3: Create `src/styles/globals.css`**

```css
@import "tailwindcss";
@import "@fontsource/bricolage-grotesque/700.css";
@import "@fontsource/bricolage-grotesque/800.css";
@import "@fontsource/hanken-grotesk/400.css";
@import "@fontsource/hanken-grotesk/500.css";
@import "@fontsource/hanken-grotesk/700.css";

@theme {
  --color-brand-50:#EAF2FF; --color-brand-100:#D9E8FF; --color-brand-300:#6FA4FF;
  --color-brand-500:#1E73FF; --color-brand-600:#0B5BD6; --color-brand-700:#063A8C;
  --color-navy:#0A2150;
  --color-ink:#0E1B33; --color-ink-2:#3A4865; --color-muted:#7B89A3;
  --color-line:#E6ECF4; --color-bg:#F4F7FB; --color-surface:#FFFFFF;
  --color-success:#0FA46A; --color-warning:#E08A1E; --color-danger:#E0453B;
  --font-display:"Bricolage Grotesque", system-ui, sans-serif;
  --font-sans:"Hanken Grotesk", system-ui, sans-serif;
  --radius-md:12px; --radius-lg:16px; --radius-xl:22px;
}

html, body, #root { height: 100%; }
body { background: var(--color-bg); color: var(--color-ink); font-family: var(--font-sans); overflow-x: hidden; }
```

- [ ] **Step 4: Import globals in `src/main.tsx`**

Replace the default CSS import with `import "@/styles/globals.css";`. Delete `src/App.css` and `src/index.css`.

- [ ] **Step 5: Verify**

Put `<h1 className="font-[var(--font-display)] text-brand-600 text-3xl">QuickClean</h1>` in `App.tsx`, run `npm run dev`, confirm blue Bricolage heading on light background.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: tailwind v4 brand tokens and fonts"
```

### Task 0.3: Initialize shadcn/ui + base components

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/*`

- [ ] **Step 1: Init shadcn**

```bash
npx shadcn@latest init
```
Choose: base color Slate, CSS variables yes, point components to `@/components/ui`, utils to `@/lib/utils`.

- [ ] **Step 2: Generate base components (BUILD §4.4)**

```bash
npx shadcn@latest add button input label textarea select checkbox radio-group switch dialog sheet dropdown-menu tabs badge avatar card table tooltip sonner skeleton separator calendar popover
```

- [ ] **Step 3: Verify `cn()` exists**

Confirm `src/lib/utils.ts` exports `cn`. If shadcn created it, keep it.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: shadcn ui base components"
```

### Task 0.4: App providers (QueryClient + Router placeholder + Toaster)

**Files:**
- Create: `src/app/providers.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Install deps**

```bash
npm install @tanstack/react-query @tanstack/react-router zustand zod react-hook-form @hookform/resolvers date-fns lucide-react recharts @tanstack/react-table
npm install -D @tanstack/router-plugin
```

- [ ] **Step 2: Create `src/app/providers.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Wrap root in `src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@/app/providers";
import App from "@/App";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders><App /></AppProviders>
  </StrictMode>,
);
```

- [ ] **Step 4: Verify**

Run: `npm run dev` — app renders, no console errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: app providers query client and toaster"
```

### Task 0.5: Project CLAUDE.md (BUILD §16 rules)

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# QuickClean — Reglas del proyecto

- **Sin backend.** Toda la data desde `src/mocks/api.ts`. Nunca `fetch` a URLs reales.
- **Formularios = shadcn/ui.** Prohibido `<input>`/`<select>` con estilos caseros.
- **TypeScript estricto.** Nada de `any`. Modelos validados con Zod.
- **Mobile-first y responsivo** en cada pantalla; sin overflow horizontal; nada pegado al borde.
- **Marca:** azul (`brand-600`) + blanco; títulos en Bricolage Grotesque.
- **Data siempre vía TanStack Query** (migración futura = cambiar solo `api.ts`).
- **Una fase a la vez**; deja cada fase navegable y commitea.
- Componentes pequeños y reutilizables en `src/components/shared`.
- Dinero con `cop()` de `@/lib/format`. Fechas con date-fns locale `es`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: project CLAUDE.md rules"
```

### Task 0.6: Vitest setup

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], globals: true },
});
```

- [ ] **Step 3: Create `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"scripts": { "dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview", "test": "vitest run", "test:watch": "vitest" }
```

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: "No test files found" (exit 0) — runner works.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: vitest setup"
```

---

## Phase 1 — Mock layer + types

### Task 1.1: Zod models (`types.ts`)

**Files:**
- Create: `src/mocks/types.ts`

- [ ] **Step 1: Write models (full set from BUILD §5)**

```ts
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/mocks/types.ts
git commit -m "feat: zod data models"
```

### Task 1.2: Pricing logic (TDD)

**Files:**
- Create: `src/lib/pricing.ts`
- Test: `src/lib/pricing.test.ts`

- [ ] **Step 1: Write failing tests (rules from spec §9)**

```ts
import { describe, it, expect } from "vitest";
import { basePrice, discount, bookingTotal, quickerPayout } from "@/lib/pricing";

describe("pricing", () => {
  it("base prices by duration", () => {
    expect(basePrice(4)).toBe(79900);
    expect(basePrice(6)).toBe(109900);
    expect(basePrice(8)).toBe(139900);
  });
  it("frequency discounts", () => {
    expect(discount("unico")).toBe(0);
    expect(discount("semanal")).toBe(0.2);
    expect(discount("quincenal")).toBe(0.12);
    expect(discount("mensual")).toBe(0.08);
  });
  it("total = round(base*(1-disc)) + supplies + platform fee", () => {
    // 6h unico, no supplies: 109900 + 6900 = 116800
    expect(bookingTotal({ duration: 6, frequency: "unico", supplies: false })).toBe(116800);
    // 6h semanal (-20%) + supplies: round(109900*0.8)=87920 +15000 +6900 = 109820
    expect(bookingTotal({ duration: 6, frequency: "semanal", supplies: true })).toBe(109820);
  });
  it("quicker payout ~70% of service value (base*(1-disc))", () => {
    expect(quickerPayout({ duration: 4, frequency: "unico" })).toBe(Math.round(79900 * 0.7));
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- pricing`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/pricing.ts`**

```ts
import type { Duration, Frequency } from "@/mocks/types";

export const PLATFORM_FEE = 6900;
export const SUPPLIES_FEE = 15000;

export function basePrice(duration: Duration): number {
  return { 4: 79900, 6: 109900, 8: 139900 }[duration];
}

export function discount(frequency: Frequency): number {
  return { unico: 0, semanal: 0.2, quincenal: 0.12, mensual: 0.08 }[frequency];
}

export function serviceValue(input: { duration: Duration; frequency: Frequency }): number {
  return Math.round(basePrice(input.duration) * (1 - discount(input.frequency)));
}

export function bookingTotal(input: { duration: Duration; frequency: Frequency; supplies: boolean }): number {
  return serviceValue(input) + (input.supplies ? SUPPLIES_FEE : 0) + PLATFORM_FEE;
}

export function quickerPayout(input: { duration: Duration; frequency: Frequency }): number {
  return Math.round(serviceValue(input) * 0.7);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- pricing`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing.ts src/lib/pricing.test.ts
git commit -m "feat: pricing logic with tests"
```

### Task 1.3: Format helpers (TDD)

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { cop } from "@/lib/format";

describe("cop", () => {
  it("formats COP with no decimals", () => {
    expect(cop(116800).replace(/\s/g, " ")).toMatch(/\$\s?116\.800/);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- format`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/format.ts`**

```ts
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export const fechaCorta = (iso: string) => format(new Date(iso), "d 'de' MMM", { locale: es });
export const fechaLarga = (iso: string) => format(new Date(iso), "EEEE d 'de' MMMM", { locale: es });
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: format helpers cop and dates"
```

### Task 1.4: Seed data (`db.ts`)

**Files:**
- Create: `src/mocks/db.ts`

- [ ] **Step 1: Write seeds (spec §10 + BUILD anexo)**

Create `db` as a mutable object holding arrays. Use the exact seed people, KPIs, payouts, and invoices from spec §10. Minimum contents:
- `services`: 4 entries — hogar ($109.900 ref), profundo, plomeria, electricista (BUILD §9.2 grid).
- `quickers`: the 6 named quickers (Diana Rojas, Carolina Méndez, Jorge Patiño, Andrés Gómez, Luisa Fernanda Gil [status incapacidad], Marcela Ríos [status inactivo]) with zone, rating, monthlyServices, contract, hourlyRate, status.
- `bookings`: 3 — one `agendado` (Jue 12 jun 2026, 6h, quickerId = Carolina, total via `bookingTotal`), one `completado` with `rated:false` (5 jun, pendiente por calificar), one `completado` with `rated:true`.
- `assignments`: ~5 for the active quicker (Carolina) for "today", each with payout via `quickerPayout`, statuses mixing `proximo`/`en_curso`/`completado`.
- `balance`: `{ available, today, week, history: [{label, amount, kind}] }` for the Quicker.
- `payouts`: 5 entries, nets $0.7M–$3.2M, status mixing pendiente/pagado, comisión ~7%.
- `invoices`: FE-001245 Conjunto Altos del Parque $8.640.000 (pagada), FE-001246 Inmobiliaria Bonanza $5.220.000 (pendiente), FE-001247 Ana López $116.800 (pagada).
- `kpis`: ingresos mes 236_400_000, completed 1284, activeQuickers 48, avgRating 4.8, revenueDelta/completedDelta (e.g. +12, +8), `revenueByMonth` (6 months), `byStatus` (completados/en_curso/cancelados), `byZone` (4 zones).
- `ratings`: [] and `leaveRequests`: [] (start empty, filled by mutations).

Example shape for one quicker and the kpis to lock the structure:

```ts
import type { Quicker, Kpis } from "./types";
import { bookingTotal, quickerPayout } from "@/lib/pricing";

const carolina: Quicker = {
  id: "q2", name: "Carolina Méndez", doc: "1.020.345.678", phone: "+57 300 123 4567",
  email: "carolina@quickclean.co", zone: "Chapinero", contract: "fijo", hourlyRate: 12000,
  status: "activo", rating: 4.9, monthlyServices: 42,
};

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

export const db = {
  services: [/* 4 services */],
  quickers: [/* diana, carolina, jorge, andres, luisa(incapacidad), marcela(inactivo) */ carolina],
  bookings: [/* 3 bookings, totals via bookingTotal(...) */],
  assignments: [/* ~5 for carolina, payout via quickerPayout(...) */],
  balance: { available: 0, today: 0, week: 0, history: [] as { label: string; amount: number; kind: string }[] },
  payouts: [/* 5 */],
  invoices: [/* 3 above */],
  ratings: [] as import("./types").Rating[],
  leaveRequests: [] as import("./types").LeaveRequest[],
  kpis,
};
```
Fill the elided arrays completely with realistic values consistent with the named people above. All booking/assignment money MUST come from `bookingTotal`/`quickerPayout` (no hand-typed totals).

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/mocks/db.ts
git commit -m "feat: seed data"
```

### Task 1.5: Fake API + mutations (TDD)

**Files:**
- Create: `src/mocks/api.ts`
- Test: `src/mocks/api.test.ts`

- [ ] **Step 1: Failing tests for mutations (the parts that must work)**

```ts
import { describe, it, expect } from "vitest";
import { api } from "@/mocks/api";
import { db } from "@/mocks/db";

describe("api mutations", () => {
  it("createBooking appends an agendado booking", async () => {
    const before = db.bookings.length;
    const b = await api.createBooking({
      serviceType: "hogar", size: "1-2", frequency: "unico", duration: 6,
      supplies: false, date: "2026-06-12", time: "08:00", address: "Cra 7 #45-10",
      pets: false, total: 116800,
    });
    expect(b.id).toBeTruthy();
    expect(b.status).toBe("agendado");
    expect(db.bookings.length).toBe(before + 1);
  });
  it("payPayout flips status to pagado", async () => {
    const id = db.payouts[0].id;
    await api.payPayout(id);
    expect(db.payouts.find(p => p.id === id)!.status).toBe("pagado");
  });
  it("submitLeave appends an en_revision request", async () => {
    const before = db.leaveRequests.length;
    const r = await api.submitLeave({
      quickerId: "q2", kind: "incapacidad", reason: "Gripa", from: "2026-06-10", to: "2026-06-12",
    });
    expect(r.status).toBe("en_revision");
    expect(db.leaveRequests.length).toBe(before + 1);
  });
  it("rateBooking marks booking rated", async () => {
    const target = db.bookings.find(b => !b.rated)!;
    await api.rateBooking({ bookingId: target.id, stars: 5, tags: ["Puntualidad"], tip: 5000 });
    expect(db.bookings.find(b => b.id === target.id)!.rated).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- api`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/mocks/api.ts`**

```ts
import { db } from "./db";
import type { Booking, Rating, LeaveRequest } from "./types";

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async listServices() { await delay(); return db.services; },
  async getMyBookings() { await delay(); return db.bookings; },
  async getBooking(id: string) { await delay(); return db.bookings.find((b) => b.id === id) ?? null; },
  async createBooking(draft: Omit<Booking, "id" | "status" | "rated" | "quickerId"> & { quickerId?: string }) {
    await delay(700);
    const b: Booking = { ...draft, id: crypto.randomUUID(), status: "agendado", rated: false, quickerId: draft.quickerId ?? "q2" };
    db.bookings.push(b);
    return b;
  },
  async rateBooking(input: Omit<Rating, "id">) {
    await delay();
    db.ratings.push({ ...input, id: crypto.randomUUID() });
    const b = db.bookings.find((x) => x.id === input.bookingId);
    if (b) b.rated = true;
    return { ok: true as const };
  },

  async quickerToday() { await delay(); return db.assignments; },
  async quickerBalance() { await delay(); return db.balance; },
  async getAssignment(id: string) { await delay(); return db.assignments.find((a) => a.id === id) ?? null; },
  async finishAssignment(id: string) {
    await delay(600);
    const a = db.assignments.find((x) => x.id === id);
    if (a) a.status = "completado";
    return { ok: true as const };
  },
  async getLeaveRequests() { await delay(); return db.leaveRequests; },
  async submitLeave(input: Omit<LeaveRequest, "id" | "status">) {
    await delay(700);
    const r: LeaveRequest = { ...input, id: crypto.randomUUID(), status: "en_revision" };
    db.leaveRequests.push(r);
    return r;
  },

  async adminKpis() { await delay(); return db.kpis; },
  async adminQuickers() { await delay(); return db.quickers; },
  async createQuicker(input: Omit<import("./types").Quicker, "id">) {
    await delay(700);
    const q = { ...input, id: crypto.randomUUID() };
    db.quickers.push(q);
    return q;
  },
  async adminPayouts() { await delay(); return db.payouts; },
  async payPayout(id: string) {
    await delay(600);
    const p = db.payouts.find((x) => x.id === id);
    if (p) p.status = "pagado";
    return { ok: true as const };
  },
  async payAllPayouts() {
    await delay(900);
    db.payouts.forEach((p) => (p.status = "pagado"));
    return { ok: true as const };
  },
  async adminInvoices() { await delay(); return db.invoices; },
};
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- api`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mocks/api.ts src/mocks/api.test.ts
git commit -m "feat: fake api with tested mutations"
```

### Task 1.6: TanStack Query hooks

**Files:**
- Create: `src/hooks/queries.ts`

- [ ] **Step 1: Write hooks**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/mocks/api";

export const useServices = () => useQuery({ queryKey: ["services"], queryFn: api.listServices });
export const useMyBookings = () => useQuery({ queryKey: ["bookings"], queryFn: api.getMyBookings });
export const useBooking = (id: string) => useQuery({ queryKey: ["booking", id], queryFn: () => api.getBooking(id) });
export const useQuickerToday = () => useQuery({ queryKey: ["assignments"], queryFn: api.quickerToday });
export const useQuickerBalance = () => useQuery({ queryKey: ["balance"], queryFn: api.quickerBalance });
export const useAssignment = (id: string) => useQuery({ queryKey: ["assignment", id], queryFn: () => api.getAssignment(id) });
export const useLeaveRequests = () => useQuery({ queryKey: ["leaves"], queryFn: api.getLeaveRequests });
export const useKpis = () => useQuery({ queryKey: ["kpis"], queryFn: api.adminKpis });
export const useQuickers = () => useQuery({ queryKey: ["quickers"], queryFn: api.adminQuickers });
export const usePayouts = () => useQuery({ queryKey: ["payouts"], queryFn: api.adminPayouts });
export const useInvoices = () => useQuery({ queryKey: ["invoices"], queryFn: api.adminInvoices });

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createBooking, onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }) });
}
export function useRateBooking() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.rateBooking, onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }) });
}
export function useFinishAssignment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.finishAssignment, onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }) });
}
export function useSubmitLeave() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.submitLeave, onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }) });
}
export function useCreateQuicker() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createQuicker, onSuccess: () => qc.invalidateQueries({ queryKey: ["quickers"] }) });
}
export function usePayPayout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.payPayout, onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }) });
}
export function usePayAll() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.payAllPayouts, onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }) });
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries.ts
git commit -m "feat: tanstack query hooks"
```

---

## Phase 2 — Stores, shells, routing, auth

### Task 2.1: Session store (TDD)

**Files:**
- Create: `src/stores/session.ts`
- Test: `src/stores/session.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useSession } from "@/stores/session";

describe("session store", () => {
  beforeEach(() => useSession.getState().logout());
  it("login sets role and user", () => {
    useSession.getState().login("quicker");
    expect(useSession.getState().role).toBe("quicker");
    expect(useSession.getState().user).not.toBeNull();
  });
  it("setRole switches role keeping session", () => {
    useSession.getState().login("client");
    useSession.getState().setRole("admin");
    expect(useSession.getState().role).toBe("admin");
    expect(useSession.getState().user).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- session`
Expected: FAIL.

- [ ] **Step 3: Implement `src/stores/session.ts`**

```ts
import { create } from "zustand";
import type { Role } from "@/mocks/types";

const USERS: Record<Role, { name: string }> = {
  client: { name: "Laura Gómez" },
  quicker: { name: "Carolina Méndez" },
  admin: { name: "Operación QuickClean" },
};

type SessionState = {
  role: Role;
  user: { name: string } | null;
  login: (role: Role) => void;
  setRole: (role: Role) => void;
  logout: () => void;
};

export const useSession = create<SessionState>((set) => ({
  role: "client",
  user: null,
  login: (role) => set({ role, user: USERS[role] }),
  setRole: (role) => set({ role, user: USERS[role] }),
  logout: () => set({ user: null }),
}));
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- session`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/session.ts src/stores/session.test.ts
git commit -m "feat: session store with role switching"
```

### Task 2.2: Booking wizard store (TDD)

**Files:**
- Create: `src/stores/booking.ts`
- Test: `src/stores/booking.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useBooking } from "@/stores/booking";

describe("booking store", () => {
  beforeEach(() => useBooking.getState().reset());
  it("starts at step 1 with default duration 6", () => {
    expect(useBooking.getState().step).toBe(1);
    expect(useBooking.getState().data.duration).toBe(6);
  });
  it("next/back move within 1..5", () => {
    useBooking.getState().back();
    expect(useBooking.getState().step).toBe(1);
    useBooking.getState().next(); useBooking.getState().next();
    expect(useBooking.getState().step).toBe(3);
  });
  it("total reflects current selections", () => {
    useBooking.getState().set({ duration: 6, frequency: "unico", supplies: false });
    expect(useBooking.getState().total()).toBe(116800);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- booking`
Expected: FAIL.

- [ ] **Step 3: Implement `src/stores/booking.ts`**

```ts
import { create } from "zustand";
import type { Booking, Duration, Frequency } from "@/mocks/types";
import { bookingTotal } from "@/lib/pricing";

type Draft = Partial<Booking> & { duration: Duration; frequency: Frequency; supplies: boolean };

const initial: Draft = {
  serviceType: "hogar", size: "1-2", frequency: "unico", duration: 6,
  supplies: false, pets: false,
};

type BookingState = {
  step: number;
  data: Draft;
  set: (patch: Partial<Draft>) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  total: () => number;
};

export const useBooking = create<BookingState>((set, get) => ({
  step: 1,
  data: { ...initial },
  set: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  next: () => set((s) => ({ step: Math.min(5, s.step + 1) })),
  back: () => set((s) => ({ step: Math.max(1, s.step - 1) })),
  reset: () => set({ step: 1, data: { ...initial } }),
  total: () => {
    const { duration, frequency, supplies } = get().data;
    return bookingTotal({ duration, frequency, supplies });
  },
}));
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- booking`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/booking.ts src/stores/booking.test.ts
git commit -m "feat: booking wizard store"
```

### Task 2.3: Shared state components — RoleSwitcher, EmptyState, LoadingState, ErrorState

**Files:**
- Create: `src/components/shared/RoleSwitcher.tsx`, `src/components/shared/States.tsx`

- [ ] **Step 1: RoleSwitcher (segmented control, persistent, 1-click)**

```tsx
import { useSession } from "@/stores/session";
import { useNavigate } from "@tanstack/react-router";
import type { Role } from "@/mocks/types";
import { cn } from "@/lib/utils";

const ROLES: { key: Role; label: string; home: string }[] = [
  { key: "client", label: "Cliente", home: "/app" },
  { key: "quicker", label: "Quicker", home: "/pro" },
  { key: "admin", label: "Admin", home: "/admin" },
];

export function RoleSwitcher() {
  const { role, setRole } = useSession();
  const navigate = useNavigate();
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-0.5 shadow-sm" role="tablist" aria-label="Cambiar rol">
      {ROLES.map((r) => (
        <button
          key={r.key}
          role="tab"
          aria-selected={role === r.key}
          onClick={() => { setRole(r.key); navigate({ to: r.home }); }}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full transition-colors",
            role === r.key ? "bg-brand-600 text-white" : "text-ink-2 hover:text-ink",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: States (`src/components/shared/States.tsx`)**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
      <p className="font-medium text-danger">Ocurrió un error al cargar.</p>
      {onRetry && <Button variant="outline" className="mt-3" onClick={onRetry}>Reintentar</Button>}
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit` (RoleSwitcher uses router — may error until Task 2.4 router exists; if so, defer this check to after 2.4).

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/
git commit -m "feat: role switcher and state components"
```

### Task 2.4: Router + role shells

**Files:**
- Create: `src/components/layout/ClientShell.tsx`, `QuickerShell.tsx`, `AdminShell.tsx`, `Brand.tsx`
- Create: `src/app/router.tsx`
- Modify: `src/App.tsx`, `vite.config.ts` (router plugin optional — use code-based routes)

- [ ] **Step 1: Brand mark**

`Brand.tsx` renders the QuickClean wordmark: blue droplet/sparkle lucide icon (`Sparkles`) + "QuickClean" in `font-display`, `text-brand-600`.

- [ ] **Step 2: Shells**

Build three shells per spec §6 / BUILD §8:
- `ClientShell` / `QuickerShell`: centered container `max-w-[1080px] mx-auto px-4 sm:px-6`, top bar = `Brand` + section nav + `RoleSwitcher` + avatar; on `<md`, nav collapses to a bottom bar (use `lucide-react` icons). Render `<Outlet />`.
- `AdminShell`: `grid lg:grid-cols-[248px_1fr]`, full-height left sidebar (navy) with nav links; topbar holds `RoleSwitcher` + avatar; on `<lg` sidebar opens in a `Sheet`. Render `<Outlet />`.

Each shell uses TanStack Router `Outlet`. Nav links use `Link` with `activeProps` for the active style (`text-brand-600`).

- [ ] **Step 3: Code-based router (`src/app/router.tsx`)**

Define a root route and the full route tree from spec §6 using `createRootRoute`/`createRoute`/`createRouter`. Wire each route's `component` to the screens (stub each screen with a placeholder that renders the screen name for now; real screens land in Phases 3–5). Layout routes apply the shells. Export `router`.

```tsx
// shape (fill all routes from spec §6)
import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
// ... import shells and (stub) screen components

const rootRoute = createRootRoute({ component: () => <Outlet /> });
// auth routes: /login, /registro
// client layout route -> ClientShell with children /app, /app/reservar, /app/servicios, /app/servicios/$id/calificar
// quicker layout route -> QuickerShell with children /pro, /pro/servicio/$id, /pro/balance, /pro/solicitudes, /pro/perfil
// admin layout route -> AdminShell with children /admin, /admin/quickers, /admin/quickers/nuevo, /admin/pagos, /admin/facturacion
export const router = createRouter({ routeTree: rootRoute.addChildren([/* ... */]) });
declare module "@tanstack/react-router" { interface Register { router: typeof router } }
```

- [ ] **Step 4: Mount router in `App.tsx`**

```tsx
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/app/router";
export default function App() { return <RouterProvider router={router} />; }
```

- [ ] **Step 5: Verify navigation**

Run: `npm run dev`. Confirm: `/app`, `/pro`, `/admin` each render with their shell; RoleSwitcher jumps between them in 1 click and lands on the role home. Run `npx tsc --noEmit` (no errors).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: router and role shells with 1-click switching"
```

### Task 2.5: Auth screens (login + registro)

**Files:**
- Create: `src/features/auth/Login.tsx`, `src/features/auth/Registro.tsx`

- [ ] **Step 1: Login (BUILD §9.1)**

Split layout: brand panel left (gradient `brand-600`→`brand-700`, tagline) + form right (stacks on mobile). Email + password `Input` (RHF + Zod: email valid, password ≥ 8). Decorative Google/Apple buttons. Three demo buttons "Entrar como Cliente / Quicker / Admin" → `useSession.login(role)` then `navigate` to role home.

- [ ] **Step 2: Registro (BUILD §9.1)**

RHF + Zod form: nombre, correo, celular (prefijo +57), ciudad (`Select`), contraseña, aceptar términos (`Checkbox`). Submit → `login("client")` → `/app` with success toast.

- [ ] **Step 3: Wire routes**

Point `/login` and `/registro` routes (Task 2.4) to these components. Make `/login` the default landing when `user` is null (redirect in root route `beforeLoad`).

- [ ] **Step 4: Verify**

Run: `npm run dev`. Visit `/login`: validation shows on bad email; each demo button enters the right role.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: login and registro screens"
```

**Phase 2 acceptance:** all three shells navigable, login works, RoleSwitcher switches in 1 click, `npm test` green, `npx tsc --noEmit` clean.

---

## Phase 3 — Cliente

> Per-screen detail: BUILD §9.2. Build screen → wire to hooks → verify by running the app. Add shared components as they first appear.

### Task 3.1: Shared — ServiceCard, BookingCard, RatingStars, PriceSummary, Stepper

**Files:**
- Create: `src/components/shared/ServiceCard.tsx`, `BookingCard.tsx`, `RatingStars.tsx`, `PriceSummary.tsx`, `Stepper.tsx`

- [ ] **Step 1: RatingStars (interactive + read-only)**

Controlled stars 1–5 with `value`, `onChange?`, `readOnly?`. Keyboard accessible (arrow keys, `aria-label`). Dynamic label when interactive (Regular…¡Excelente!).

- [ ] **Step 2: PriceSummary**

Takes `{ duration, frequency, supplies }`, renders breakdown (base, descuento, implementos, tarifa plataforma, **total**) using `cop()` and `@/lib/pricing`. Sticky-friendly (caller positions it).

- [ ] **Step 3: Stepper**

Renders 1–5 progress with current step highlighted, `aria-current` on active.

- [ ] **Step 4: ServiceCard / BookingCard**

`ServiceCard`: image/gradient + name + CTA. `BookingCard`: service, date (`fechaCorta`), status `Badge`, action slot (e.g. "Calificar").

- [ ] **Step 5: Verify compile + commit**

Run: `npx tsc --noEmit`.
```bash
git add src/components/shared/
git commit -m "feat: client shared components"
```

### Task 3.2: Client Home (`/app`)

**Files:**
- Create: `src/features/client/Home.tsx`

- [ ] **Step 1: Build (BUILD §9.2 Home)**

Greeting + avatar; search `Input` with icon; hero "Aseo de Hogar" + CTA "Agendar ahora" → `/app/reservar`. Services grid (`useServices`, `ServiceCard`, `auto-fit`). Two-column row (stacks `<md`): "Próximo servicio" + "Pendiente por calificar" (from `useMyBookings`, CTA → `/app/servicios/$id/calificar`). `LoadingState` while loading.

- [ ] **Step 2: Wire route + verify**

Run: `npm run dev` → `/app` shows skeletons then data; CTA navigates to wizard.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: client home"
```

### Task 3.3: Booking wizard steps 1–4 (`/app/reservar`)

**Files:**
- Create: `src/features/client/reservar/Reservar.tsx`, `Step1Tipo.tsx`, `Step2Frecuencia.tsx`, `Step3Duracion.tsx`, `Step4FechaDireccion.tsx`

- [ ] **Step 1: Container**

`Reservar.tsx` renders `Stepper` + the active step (from `useBooking().step`) + a **sticky `PriceSummary`** + footer with Back/Next (Next disabled until step is valid). Next on step 5 → payment.

- [ ] **Step 2: Steps (BUILD §9.2 Reserva)**
- Step1: service type + space size (chips/radio) → `set({ serviceType, size })`.
- Step2: frequency radio with discount labels → `set({ frequency })`.
- Step3: duration 4/6/8 selectable cards ("Popular" on 6h) + supplies switch → `set({ duration, supplies })`.
- Step4: date-picker (`Calendar`+`Popover`, locale es) + time slots + address `Input` + notes `Textarea` + pets `Switch` → `set({ date, time, address, notes, pets })`.

- [ ] **Step 3: Verify**

Run: `npm run dev` → total updates live as selections change; Back preserves data; cannot Next with empty required fields.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: booking wizard steps 1-4"
```

### Task 3.4: Wizard step 5 — Resumen + Pago simulado + Confirmación

**Files:**
- Create: `src/features/client/reservar/Step5Resumen.tsx`, `PaymentStep.tsx`, `Confirmacion.tsx`

- [ ] **Step 1: Resumen**

Full `PriceSummary` breakdown + cupón `Input` (decorative) → button "Ir a pagar" opens `PaymentStep`.

- [ ] **Step 2: PaymentStep (isolated — spec §12)**

Method tabs Tarjeta / PSE / Nequi / Bre-B (Wompi style). Tarjeta: visual card + formatted inputs (grouped number, MM/YY, CVV — visual only). "Pagar" → spinner (`setTimeout` 1200ms via `useCreateBooking().mutateAsync` with `total()` and the draft) → on success show `Confirmacion`.

- [ ] **Step 3: Confirmación**

Success screen with assigned Quicker (Carolina), booking summary, CTAs "Ver seguimiento" → `/app/servicios` and "Volver al inicio" → `/app`. Calls `useBooking().reset()` on mount.

- [ ] **Step 4: Verify**

Run: `npm run dev` → complete a 6h booking; total matches pricing rules; pay shows loading; confirmation shows quicker; new booking appears in `/app/servicios`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: wizard resumen, simulated payment, confirmation"
```

### Task 3.5: Mis servicios + Calificar

**Files:**
- Create: `src/features/client/MisServicios.tsx`, `src/features/client/Calificar.tsx`

- [ ] **Step 1: Mis servicios**

List `useMyBookings()` as `BookingCard`s with status badges; "Calificar" action on completed+unrated → `/app/servicios/$id/calificar`. `EmptyState` if none.

- [ ] **Step 2: Calificar (BUILD §9.2 Calificar)**

Quicker avatar, interactive `RatingStars` (dynamic label), aspect chips multi-select (Puntualidad, Limpieza, Amabilidad, Comunicación), comment `Textarea`, tip chips single-select. Submit → `useRateBooking().mutateAsync` → thank-you screen; booking now `rated`.

- [ ] **Step 3: Verify**

Run: `npm run dev` → rate the pending booking; it disappears from "pendiente por calificar"; thank-you shows.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: mis servicios and calificar"
```

**Phase 3 acceptance:** Client flow end-to-end (home → book 4/6/8h → pay → confirm → rate), totals correct, states present.

---

## Phase 4 — Quicker

> Per-screen detail: BUILD §9.3.

### Task 4.1: Shared — AssignmentCard, StatPill, MapView

**Files:**
- Create: `src/components/shared/AssignmentCard.tsx`, `StatPill.tsx`, `MapView.tsx`

- [ ] **Step 1: MapView (SVG placeholder first — spec risk b)**

`MapView` renders a styled SVG map block with a pin + "X min · Y km" caption. Props `{ minutes, km }`. (MapLibre swap deferred to polish.)

- [ ] **Step 2: AssignmentCard**

Time, client, address, **payout** (`cop`), status badge (proximo/en_curso/completado). Tap → `/pro/servicio/$id`.

- [ ] **Step 3: StatPill**

Small metric (icon + value + label) for the day header.

- [ ] **Step 4: Verify compile + commit**

Run: `npx tsc --noEmit`.
```bash
git add src/components/shared/ && git commit -m "feat: quicker shared components"
```

### Task 4.2: Hoy (`/pro`)

**Files:**
- Create: `src/features/quicker/Hoy.tsx`

- [ ] **Step 1: Build**

Header with **balance del día** (gradient) + `StatPill`s (servicios, horas, rating) from `useQuickerBalance()`. Quick links: Mi balance, Incapacidad, Licencia. List of `useQuickerToday()` as `AssignmentCard`s. `LoadingState` while loading.

- [ ] **Step 2: Verify + commit**

Run: `npm run dev` → `/pro` shows balance + today's services with payouts.
```bash
git add -A && git commit -m "feat: quicker hoy"
```

### Task 4.3: Detalle de servicio (`/pro/servicio/:id`)

**Files:**
- Create: `src/features/quicker/DetalleServicio.tsx`

- [ ] **Step 1: Build (BUILD §9.3 Detalle)**

`MapView` + client info (avatar, rating, call button), breakdown + **tu pago**, before/after photo reminder, "Finalizar servicio" → `useFinishAssignment().mutateAsync` → status becomes completado + success toast.

- [ ] **Step 2: Verify + commit**

Run: `npm run dev` → open an assignment; finish flips its status.
```bash
git add -A && git commit -m "feat: quicker service detail"
```

### Task 4.4: Balance (`/pro/balance`)

**Files:**
- Create: `src/features/quicker/Balance.tsx`

- [ ] **Step 1: Build**

Available-to-withdraw + "Retirar" button (toast on click), Hoy/Semana cards, movement history (services, withdrawals, licenses) with +/− amounts from `balance.history`.

- [ ] **Step 2: Verify + commit**

```bash
git add -A && git commit -m "feat: quicker balance"
```

### Task 4.5: Solicitudes (`/pro/solicitudes`) + FileDrop

**Files:**
- Create: `src/features/quicker/Solicitudes.tsx`, `src/components/shared/FileDrop.tsx`

- [ ] **Step 1: FileDrop (mock)**

Drag/drop or click; shows selected file name + preview; no real upload. Exposes `onFile(name: string)`.

- [ ] **Step 2: Solicitudes (BUILD §9.3, `Tabs`)**
- Incapacidad: tipo `Select`, fechas date-picker, días, `FileDrop` (foto/PDF), observaciones → `useSubmitLeave({kind:"incapacidad", ...})`.
- Licencia: tipo Remunerada / No remunerada (radio cards), motivo `Select`, fechas, comentario, soporte opcional → `useSubmitLeave({kind: "licencia_remunerada"|"licencia_no_remunerada", ...})`.
- On submit → "En revisión" state with a radicado id (from returned request).

- [ ] **Step 3: Verify + commit**

Run: `npm run dev` → submit incapacidad with a mock file → "En revisión" shows.
```bash
git add -A && git commit -m "feat: quicker solicitudes with file upload mock"
```

### Task 4.6: Perfil (`/pro/perfil`)

**Files:**
- Create: `src/features/quicker/Perfil.tsx`

- [ ] **Step 1: Build**

Quicker data, rating, documents list, "Cerrar sesión" → `useSession.logout()` → `/login`.

- [ ] **Step 2: Verify + commit**

```bash
git add -A && git commit -m "feat: quicker perfil"
```

**Phase 4 acceptance:** Quicker sees services with value + balance, opens detail with map, submits incapacidad and licencia.

---

## Phase 5 — Admin

> Per-screen detail: BUILD §9.4.

### Task 5.1: Shared — StatCard, DataTable

**Files:**
- Create: `src/components/shared/StatCard.tsx`, `src/components/shared/DataTable.tsx`

- [ ] **Step 1: StatCard**

Icon + value + label + delta % (green/red) for KPIs.

- [ ] **Step 2: DataTable (TanStack Table generic)**

Generic `DataTable<T>` with `columns` + `data`, sorting, simple pagination, `overflow-x-auto` wrapper for mobile.

- [ ] **Step 3: Verify compile + commit**

Run: `npx tsc --noEmit`.
```bash
git add src/components/shared/ && git commit -m "feat: admin shared components"
```

### Task 5.2: Indicadores (`/admin`)

**Files:**
- Create: `src/features/admin/Dashboard.tsx`

- [ ] **Step 1: Build (BUILD §9.4 Indicadores)**

KPIs (`StatCard` ×4 from `useKpis`): ingresos mes, servicios completados, Quickers activos, rating medio (with delta). Recharts bar chart (revenueByMonth), donut (byStatus) + legend, top-3 quickers, servicios por zona (progress bars). KPIs grid 4→2→1.

- [ ] **Step 2: Verify + commit**

Run: `npm run dev` → `/admin` renders charts with seed data.
```bash
git add -A && git commit -m "feat: admin dashboard"
```

### Task 5.3: Quickers table + Crear Quicker

**Files:**
- Create: `src/features/admin/Quickers.tsx`, `src/features/admin/CrearQuicker.tsx`

- [ ] **Step 1: Quickers (BUILD §9.4 Gestionar)**

Toolbar: search, status filter (Tabs/segment), "Crear Quicker" button. `DataTable`: Quicker (avatar+name+doc), zone, status `Badge`, rating (`RatingStars` readOnly), services/month, rate/h, actions (ver/editar/pagar).

- [ ] **Step 2: Crear Quicker (BUILD §9.4 Crear)**

2-col form (stacks `<md`): photo `FileDrop`, personal data (nombre, doc, celular, email), operación (ciudad, zona, contrato `Select`, tarifa/h), notas `Textarea`. RHF + Zod → `useCreateQuicker().mutateAsync` → back to table + success toast.

- [ ] **Step 3: Verify + commit**

Run: `npm run dev` → create a quicker; it appears in the table.
```bash
git add -A && git commit -m "feat: admin quickers table and create form"
```

### Task 5.4: Pagar Quickers (`/admin/pagos`)

**Files:**
- Create: `src/features/admin/Pagos.tsx`

- [ ] **Step 1: Build (BUILD §9.4 Pagar)**

Period selector (quincena/mes); summary cards (total a pagar, pendientes, comisión). Liquidation table (`usePayouts`): Quicker, servicios, horas, bruto, deducciones, neto, estado, **Pagar** button (confirm `Dialog` + loading → `usePayPayout` → Badge "Pagado"). "Pagar a todos" → `usePayAll`.

- [ ] **Step 2: Verify + commit**

Run: `npm run dev` → pay one payout → status flips to Pagado; "Pagar a todos" clears pendientes.
```bash
git add -A && git commit -m "feat: admin pagos"
```

### Task 5.5: Facturación (`/admin/facturacion`)

**Files:**
- Create: `src/features/admin/Facturacion.tsx`

- [ ] **Step 1: Build (BUILD §9.4 Facturación)**

Panel "Cuentas de cobro · Quickers": documento, periodo, Quicker, valor, estado, descargar (toast). "Generar quincena" button. Panel "Facturas · Clientes" (`useInvoices`): número, cliente, periodo, valor, estado, ver.

- [ ] **Step 2: Verify + commit**

Run: `npm run dev` → both panels render seed invoices.
```bash
git add -A && git commit -m "feat: admin facturacion"
```

**Phase 5 acceptance:** Admin sees indicators, creates/manages Quickers, pays, and invoices.

---

## Phase 6 — Polish, audit, deploy

### Task 6.1: States + empty/error everywhere

- [ ] **Step 1:** Audit every screen for loading (skeleton), empty, and error states. Add `LoadingState`/`EmptyState`/`ErrorState` where missing (lists, tables, dashboard).
- [ ] **Step 2:** Verify by toggling: temporarily make a query throw → ErrorState shows. Revert.
- [ ] **Step 3:** Commit `git commit -am "feat: complete loading/empty/error states"`.

### Task 6.2: Responsive sweep (360/768/1280/1440)

- [ ] **Step 1:** `npm run dev`, use browser devtools at 360/768/1280/1440 for each screen. Fix overflow, edge-hugging, broken grids. No horizontal scroll anywhere.
- [ ] **Step 2:** Commit `git commit -am "fix: responsive at 360/768/1280/1440"`.

### Task 6.3: Microinteractions + toasts pass

- [ ] **Step 1:** Ensure transitions 150–250ms on interactive elements; success/error `sonner` toasts on every mutation (booking, rate, leave, create quicker, pay).
- [ ] **Step 2:** Commit `git commit -am "feat: microinteractions and toasts"`.

### Task 6.4: Skill-driven design + a11y audit

- [ ] **Step 1:** Invoke `frontend-design` + `ui-ux-pro-max` to review UI polish (modern/minimalist, blue/white). Apply suggestions.
- [ ] **Step 2:** Invoke `accessibility-auditor` (+ `web-design-guidelines`). Fix all critical WCAG 2.1 AA issues (labels, aria on stars/stepper/tabs, focus visible, contrast). 0 criticals.
- [ ] **Step 3:** Commit `git commit -am "fix: a11y and design audit"`.

### Task 6.5: (Optional) Playwright E2E of the demo script

- [ ] **Step 1:** Install Playwright; invoke `playwright-e2e`.
- [ ] **Step 2:** Author one E2E per role following spec §11 (book+pay+rate; quicker submit leave; admin pay payout). Run `npx playwright test` → green.
- [ ] **Step 3:** Commit `git commit -am "test: e2e demo flows"`.

### Task 6.6: Build + deploy

- [ ] **Step 1:** `npm run build` → succeeds; check bundle < 300 KB gz (spec §12) — code-split routes if over.
- [ ] **Step 2:** Invoke `deploy-to-vercel` → get shareable preview link.
- [ ] **Step 3:** Commit any config + record the link.

**Phase 6 acceptance / DoD (spec §15):** all DoD checkboxes pass; demo script §11 runs without snags; shareable link works.

---

## Self-review notes (author)

- **Spec coverage:** §1 obj → all phases; §2 scope → Phases 3–5 (every screen has a task); §3 RoleSwitcher → 2.3/2.4; §5 tokens → 0.2; §6 routes/click budget → 2.4 + verified per screen; §7 models → 1.1; §8 arch/flow → 1.x/1.6; §9 pricing → 1.2 (tested); §10 seeds → 1.4; §11 demo → 6.5; §12 states/responsive/perf → 6.1/6.2/6.6; §13 skills → 6.4/6.6; §14 phases → Phases 0–6; §15 DoD → 6.6; §16 risks → MapView SVG (4.1), in-memory data (accepted), images fallback (apply in cards).
- **No placeholders:** logic-critical files (pricing, api, stores, format) ship full code + tests. UI tasks give exact files, component breakdown, hook wiring, and a run-the-app verification; per-screen visual detail is referenced precisely to BUILD §9 (in-repo), not left as "TBD".
- **Type consistency:** hook names (`useCreateBooking`, `usePayPayout`, `usePayAll`, `useFinishAssignment`, `useSubmitLeave`) match `api.ts` methods; store APIs (`set/next/back/reset/total`, `login/setRole/logout`) match their tests; `Kpis` fields used in 5.2 match 1.1.
