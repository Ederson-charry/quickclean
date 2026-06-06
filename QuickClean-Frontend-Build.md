# QuickClean — Documento de Construcción del Front (Funcional, sin backend)

> **Objetivo:** construir desde cero el frontend funcional de la plataforma QuickClean (servicio de aseo a domicilio) con **datos mock**, navegable e interactivo, listo para enchufar un backend real más adelante.
> **Para:** Claude Code.
> **Marca:** Quick Clean — **blanco + azul**.
> **Sin backend por ahora:** toda la data viene de una capa mock tipada (fake API con latencia simulada). Nada de llamadas reales.

---

## 0. Cómo usar este documento con Claude Code

1. Crea el repo y guarda este archivo como `docs/BUILD.md`. Crea también un `CLAUDE.md` en la raíz con las reglas de la sección 16.
2. Construye **por fases** (sección 15). No intentes todo de una. Al terminar cada fase, verifica los criterios de aceptación antes de seguir.
3. Regla de oro: **componentes modernos de verdad**. Usa `shadcn/ui` para inputs, selects, textarea, dialog, etc. Nada de `<input>` con estilos caseros. Si un componente se ve "anticuado", está mal.
4. Mobile-first y responsivo en todas las pantallas. Cliente y Quicker son apps mobile-first que también lucen bien en desktop; Admin es un dashboard de escritorio que colapsa en móvil.

---

## 1. Visión y alcance

QuickClean conecta a clientes que necesitan aseo de su hogar con profesionales ("Quickers"). Hay **tres experiencias** dentro de un mismo código:

| Rol | Quién | Qué hace |
|-----|-------|----------|
| **Cliente** | Persona que contrata | Se registra, agenda un servicio de **4/6/8 horas**, paga (simulado) y **evalúa** el servicio. |
| **Quicker** | Profesional de aseo | Ve sus servicios del día con su valor, su **balance/ganancias**, sube **incapacidades** y solicita **licencias** (remuneradas / no remuneradas). |
| **Admin** | Operación QuickClean | **Indicadores**, **crear/gestionar** Quickers, **pagar** Quickers y **facturar** (cuentas de cobro + facturas a clientes). |

**Alcance de esta entrega:** solo front. Datos mock. Flujos completos y navegables. Estados de carga, vacío y error simulados. Sin auth real (login simulado + selector de rol para demo).

---

## 2. Stack técnico

Alineado a SmartControl V5 para que sea consistente con lo que ya manejas.

- **React 19 + TypeScript** (modo estricto).
- **Vite 6** como bundler.
- **Tailwind CSS v4** (config CSS-first con `@theme`).
- **shadcn/ui** (Radix UI) para todos los componentes de formulario y overlays. Esto resuelve de raíz el problema de "inputs/selects anticuados".
- **TanStack Router** para ruteo tipado + layouts por rol.
- **TanStack Query** para el manejo de la data mock (cache, loading, error) — así el día de mañana solo se cambia la implementación del fetcher.
- **TanStack Table** para las tablas del Admin (Quickers, pagos, facturación).
- **Zustand** para estado global (sesión/rol, asistente de reserva).
- **Zod** para validación de formularios y esquemas de los modelos mock.
- **React Hook Form** + `@hookform/resolvers/zod` para todos los formularios.
- **lucide-react** para iconografía.
- **Recharts** para los gráficos del dashboard.
- **MapLibre GL** (o un placeholder SVG si se quiere evitar dependencia al inicio) para el mapa del detalle de servicio del Quicker.
- **date-fns** (locale `es`) para fechas.
- **Vitest + Testing Library** para pruebas; **Playwright** para E2E (opcional en fase final).

> Si prefieres arrancar más liviano, MapLibre y Recharts pueden mockearse con SVG propio en la primera pasada y reemplazarse luego.

---

## 3. Estructura del proyecto

```
quickclean-web/
├─ CLAUDE.md
├─ docs/BUILD.md                 # este documento
├─ index.html
├─ vite.config.ts
├─ tailwind.config.ts            # (o tokens en CSS con Tailwind v4)
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ router.tsx              # definición de rutas (TanStack Router)
│  │  └─ providers.tsx           # QueryClient, RouterProvider, Theme
│  ├─ styles/
│  │  └─ globals.css             # @theme tokens + base
│  ├─ components/
│  │  ├─ ui/                     # shadcn/ui generado (button, input, select, ...)
│  │  ├─ layout/                 # AppShell, Sidebar, Topbar, MobileNav
│  │  └─ shared/                 # StatCard, RatingStars, Stepper, FileDrop, MapView, EmptyState
│  ├─ features/
│  │  ├─ auth/                   # login, registro, role-switch (demo)
│  │  ├─ client/                 # home, reserva (wizard), servicios, calificar
│  │  ├─ quicker/                # hoy, servicio, balance, solicitudes, perfil
│  │  └─ admin/                  # dashboard, quickers, pagos, facturacion
│  ├─ mocks/
│  │  ├─ db.ts                   # datos semilla (seed)
│  │  ├─ api.ts                  # fake API (promesas con latencia)
│  │  └─ types.ts               # modelos TypeScript + esquemas Zod
│  ├─ stores/
│  │  ├─ session.ts              # rol activo, usuario demo
│  │  └─ booking.ts              # estado del asistente de reserva
│  ├─ hooks/                     # useServices, useQuickers, usePayouts, ...
│  └─ lib/
│     ├─ format.ts               # formato COP, fechas, etc.
│     └─ utils.ts                # cn(), helpers
```

---

## 4. Sistema de diseño

### 4.1 Paleta (blanco + azul)

```css
/* src/styles/globals.css  — Tailwind v4 @theme */
@theme {
  /* Marca */
  --color-brand-50:  #EAF2FF;
  --color-brand-100: #D9E8FF;
  --color-brand-300: #6FA4FF;
  --color-brand-500: #1E73FF;   /* azul vivo */
  --color-brand-600: #0B5BD6;   /* primario */
  --color-brand-700: #063A8C;
  --color-navy:      #0A2150;    /* títulos / sidebar admin */

  /* Neutros */
  --color-ink:    #0E1B33;
  --color-ink-2:  #3A4865;
  --color-muted:  #7B89A3;
  --color-line:   #E6ECF4;
  --color-bg:     #F4F7FB;
  --color-surface:#FFFFFF;

  /* Semánticos */
  --color-success: #0FA46A;
  --color-warning: #E08A1E;
  --color-danger:  #E0453B;

  /* Tipografía */
  --font-display: "Bricolage Grotesque", system-ui, sans-serif;
  --font-sans:    "Hanken Grotesk", system-ui, sans-serif;

  /* Radios y sombras */
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --shadow-sm: 0 1px 3px rgba(14,27,51,.05), 0 8px 20px rgba(14,27,51,.06);
  --shadow-md: 0 4px 10px rgba(14,27,51,.06), 0 24px 56px rgba(14,27,51,.12);
}
```

### 4.2 Tipografía
- **Display / títulos:** Bricolage Grotesque (700–800). Distintiva, no genérica.
- **Cuerpo / UI:** Hanken Grotesk (400–700).
- Cargar vía `@fontsource` o `<link>` de Google Fonts. Definir escala: H1 28–34, H2 20–22, H3 16, body 14–15, caption 12.

### 4.3 Principios visuales (importante — esto resuelve el "se ve anticuado")
- **Bordes finos (1px)**, radios sobrios (10–14px), **sombras sutiles** (no abultadas).
- Inputs altura ~44px, foco con **ring azul** limpio (`ring-2 ring-brand-500/30`), placeholder gris suave.
- Densidad cómoda, mucho espacio en blanco, jerarquía clara.
- Estados siempre presentes: hover, focus, disabled, loading, vacío, error.
- Microinteracciones suaves (150–250ms). Nada de animaciones largas.

### 4.4 Componentes base (shadcn/ui a generar)
`button, input, label, textarea, select, checkbox, radio-group, switch, dialog, sheet, dropdown-menu, tabs, badge, avatar, card, table, tooltip, sonner (toasts), skeleton, separator, calendar/date-picker`.

> Genera estos con `npx shadcn@latest add ...` y ajústalos a los tokens de marca. **No** crear inputs/selects a mano.

---

## 5. Modelos de datos (TypeScript + Zod) — mock

```ts
// src/mocks/types.ts
import { z } from "zod";

export type Role = "client" | "quicker" | "admin";

export const ServiceType = z.enum(["hogar", "profundo", "postobra"]);
export const Frequency   = z.enum(["unico", "semanal", "quincenal", "mensual"]);
export const Duration    = z.union([z.literal(4), z.literal(6), z.literal(8)]);

export const Service = z.object({
  id: z.string(),
  type: ServiceType,
  name: z.string(),
  desc: z.string(),
  basePrice: z.number(),       // COP por servicio según duración base
  image: z.string().optional(),
});

export const Booking = z.object({
  id: z.string(),
  serviceType: ServiceType,
  size: z.enum(["estudio", "1-2", "3+", "casa"]),
  frequency: Frequency,
  duration: Duration,          // 4 | 6 | 8
  supplies: z.boolean(),       // implementos +$15.000
  date: z.string(),            // ISO
  time: z.string(),            // "08:00"
  address: z.string(),
  notes: z.string().optional(),
  pets: z.boolean().default(false),
  total: z.number(),
  status: z.enum(["agendado", "en_curso", "completado", "cancelado"]),
  quickerId: z.string().optional(),
  rated: z.boolean().default(false),
});

export const Quicker = z.object({
  id: z.string(),
  name: z.string(),
  doc: z.string(),
  phone: z.string(),
  email: z.string(),
  zone: z.string(),
  contract: z.enum(["prestacion", "fijo", "indefinido"]),
  hourlyRate: z.number(),
  status: z.enum(["activo", "inactivo", "incapacidad"]),
  rating: z.number(),          // 0–5
  monthlyServices: z.number(),
  avatar: z.string().optional(),
});

export const ServiceAssignment = z.object({   // lo que ve el Quicker
  id: z.string(),
  bookingId: z.string(),
  clientName: z.string(),
  address: z.string(),
  time: z.string(),
  durationHours: z.number(),
  payout: z.number(),          // lo que gana el Quicker por el servicio
  status: z.enum(["proximo", "en_curso", "completado"]),
});

export const Payout = z.object({               // liquidación quincenal por Quicker
  id: z.string(),
  quickerId: z.string(),
  period: z.string(),          // "1–15 jun 2026"
  services: z.number(),
  hours: z.number(),
  gross: z.number(),
  deductions: z.number(),
  net: z.number(),
  status: z.enum(["pendiente", "pagado"]),
});

export const Invoice = z.object({              // factura a cliente
  id: z.string(),
  number: z.string(),          // "FE-001245"
  client: z.string(),
  period: z.string(),
  amount: z.number(),
  status: z.enum(["pagada", "pendiente"]),
});

export const Rating = z.object({
  id: z.string(),
  bookingId: z.string(),
  stars: z.number().min(1).max(5),
  tags: z.array(z.string()),
  comment: z.string().optional(),
  tip: z.number().default(0),
});

export const LeaveRequest = z.object({
  id: z.string(),
  quickerId: z.string(),
  kind: z.enum(["incapacidad", "licencia_remunerada", "licencia_no_remunerada"]),
  reason: z.string(),
  from: z.string(),
  to: z.string(),
  fileName: z.string().optional(),
  status: z.enum(["en_revision", "aprobada", "rechazada"]),
});

export type Service = z.infer<typeof Service>;
export type Booking = z.infer<typeof Booking>;
export type Quicker = z.infer<typeof Quicker>;
// ...idem para el resto
```

### Reglas de precio (cliente)
- Tarifas base: **4h $79.900 · 6h $109.900 · 8h $139.900**.
- Implementos: **+$15.000**.
- Tarifa de plataforma: **$6.900**.
- Descuentos por frecuencia: semanal −20%, quincenal −12%, mensual −8% (único = 0%).
- `total = round(base * (1 - descuento)) + (supplies ? 15000 : 0) + 6900`.
- Pago al Quicker ≈ 70% del valor del servicio (para mostrar en su balance).

---

## 6. Capa de datos mock (fake API)

```ts
// src/mocks/api.ts
import { db } from "./db";

const delay = (ms = 450) => new Promise(r => setTimeout(r, ms));

export const api = {
  async listServices() { await delay(); return db.services; },
  async getMyBookings() { await delay(); return db.bookings; },
  async createBooking(draft) { await delay(700); const b = {...draft, id: crypto.randomUUID(), status:"agendado"}; db.bookings.push(b); return b; },
  async rateBooking(input) { await delay(); /* marca booking.rated = true */ return { ok: true }; },

  async quickerToday() { await delay(); return db.assignments; },
  async quickerBalance() { await delay(); return db.balance; },
  async submitLeave(input) { await delay(700); return { id: crypto.randomUUID(), status:"en_revision" }; },

  async adminKpis() { await delay(); return db.kpis; },
  async adminQuickers() { await delay(); return db.quickers; },
  async createQuicker(input) { await delay(700); /* push */ return { ok:true }; },
  async adminPayouts() { await delay(); return db.payouts; },
  async payPayout(id) { await delay(600); /* status = pagado */ return { ok:true }; },
  async adminInvoices() { await delay(); return db.invoices; },
};
```

- **Latencia simulada** para mostrar skeletons y spinners reales.
- Toda la data en `db.ts` como arrays mutables en memoria (se reinicia al refrescar).
- Consumir **siempre vía TanStack Query** (`useQuery`/`useMutation`) para que la migración a backend real sea solo cambiar `api.ts`.
- Seeds: 6 Quickers, ~5 servicios del día, 3 reservas (1 agendada, 1 pendiente por calificar, 1 completada), 5 payouts, 3 facturas, KPIs del dashboard.

---

## 7. Estado global (Zustand)

```ts
// src/stores/session.ts
type SessionState = {
  role: Role;                 // "client" | "quicker" | "admin"
  user: { name: string; avatar?: string } | null;
  setRole: (r: Role) => void;
  login: (role: Role) => void;
  logout: () => void;
};

// src/stores/booking.ts  — asistente de reserva
type BookingState = {
  step: number;               // 1..5
  data: Partial<Booking>;
  set: (patch: Partial<Booking>) => void;
  next: () => void; back: () => void; reset: () => void;
  total: () => number;        // recalcula con las reglas de precio
};
```

> Para la demo, incluir un **selector de rol** flotante (solo en dev) o en la pantalla de login, ya que no hay auth real.

---

## 8. Rutas (TanStack Router)

```
/login                         (auth)
/registro                      (auth)

# Cliente (shell mobile-first con topnav)
/app                           Home cliente
/app/reservar                  Asistente de reserva (stepper, estado en Zustand)
/app/servicios                 Mis servicios
/app/servicios/:id/calificar   Evaluar servicio

# Quicker (shell mobile-first)
/pro                           Hoy (servicios + balance del día)
/pro/servicio/:id              Detalle de servicio (mapa, check-in/out)
/pro/balance                   Mis ganancias
/pro/solicitudes               Incapacidad / Licencia (tabs)
/pro/perfil                    Perfil

# Admin (shell dashboard con sidebar)
/admin                         Indicadores
/admin/quickers                Gestionar Quickers (tabla)
/admin/quickers/nuevo          Crear Quicker (form)
/admin/pagos                   Pagar Quickers
/admin/facturacion             Facturación (cuentas de cobro + facturas)
```

Cada grupo usa un **layout/shell** distinto:
- **ClientShell / QuickerShell:** contenedor centrado (máx ~1080px), top-nav con logo + secciones + avatar; en móvil el nav colapsa a barra inferior o menú.
- **AdminShell:** sidebar izquierdo de altura completa + topbar; en móvil el sidebar colapsa a barra superior desplazable o `Sheet`.

---

## 9. Especificación pantalla por pantalla

> Para cada pantalla: **objetivo · componentes · interacción · estados · criterios de aceptación**.

### 9.1 Auth

**Login (`/login`)** — layout split: panel de marca con imagen a la izquierda + formulario a la derecha (apila en móvil).
- Componentes: `Card`, `Input` (email), `Input` password, `Button` Google/Apple (decorativos), `Button` primario "Iniciar sesión".
- Interacción: validación Zod (email válido, password ≥ 8). "Iniciar sesión" → `session.login(role)` y redirige al home del rol.
- Para demo: incluir selector de rol (Cliente/Quicker/Admin) o botones "Entrar como…".
- Criterios: responsive, foco/validación visibles, no se ve "mockup".

**Registro (`/registro`)** — formulario: nombre, correo, celular (prefijo +57), ciudad (Select), contraseña, aceptar términos (Checkbox). React Hook Form + Zod.

### 9.2 Cliente

**Home (`/app`)**
- Saludo + avatar; buscador (`Input` con icono); **hero** "Aseo de Hogar" con CTA "Agendar ahora".
- **Grilla de servicios** (Aseo Hogar, Aseo Profundo, Plomería, Electricista) — `Card` con imagen/gradiente, responsive (auto-fit).
- Fila de dos columnas (apila en móvil): **Próximo servicio** y **Pendiente por calificar** (CTA → `/app/servicios/:id/calificar`).
- Estados: skeletons mientras carga la data.

**Reserva (`/app/reservar`)** — asistente de 5 pasos con `Stepper` (estado en `booking` store). El total se recalcula en cada paso y se muestra fijo.
1. **Tipo de servicio** + tamaño del espacio (chips/radio).
2. **Frecuencia** (único/semanal/quincenal/mensual con su descuento).
3. **Duración 4/6/8 h** (cards seleccionables, "Popular" en 6h) + toggle implementos.
4. **Fecha y hora** (date-picker + franjas) + **dirección** + notas + mascotas.
5. **Resumen** (desglose de precio, cupón) → botón "Ir a pagar".
- **Pago (simulado):** métodos Tarjeta / PSE / Nequi / Bre-B (estilo Wompi). Tarjeta con tarjeta visual + inputs formateados. Botón "Pagar" → spinner → **Confirmación** con Quicker asignado.
- Criterios: el total siempre cuadra con las reglas; se puede ir atrás sin perder datos; pago muestra loading; confirmación con CTA a seguimiento y a inicio.

**Mis servicios (`/app/servicios`)** — lista de reservas con estado (agendado/completado) y acción (calificar si aplica).

**Calificar (`/app/servicios/:id/calificar`)**
- Avatar del Quicker, **estrellas interactivas 1–5** (label dinámico: Regular…¡Excelente!), chips de aspectos (multi-select: Puntualidad, Limpieza, Amabilidad, Comunicación), `Textarea` comentario, propina (chips, single-select).
- Enviar → `mutation` → pantalla de agradecimiento; marca `booking.rated = true`.

### 9.3 Quicker

**Hoy (`/pro`)**
- Header con **balance del día** (gradiente) + métricas (servicios, horas, rating).
- Accesos: Mi balance, Incapacidad, Licencia.
- **Lista de servicios del día** con hora, cliente, dirección, **valor** y estado (en curso / siguiente / completado). Tap → detalle.

**Detalle de servicio (`/pro/servicio/:id`)**
- **Mapa** (MapView) con pin + "X min · Y km", datos del cliente (avatar, rating, botón llamar), desglose y **tu pago**, recordatorio de foto antes/después, botón "Finalizar servicio".

**Balance (`/pro/balance`)**
- Disponible para retirar + botón Retirar; tarjetas Hoy / Semana; **historial de movimientos** (servicios, retiros, licencias) con montos +/−.

**Solicitudes (`/pro/solicitudes`)** — `Tabs`: **Incapacidad** y **Licencia**.
- Incapacidad: tipo (Select), fechas (date-picker), días, **subir archivo** (`FileDrop`, foto/PDF), observaciones.
- Licencia: tipo **Remunerada / No remunerada** (radio cards), motivo (Select), fechas, comentario, soporte opcional.
- Enviar → estado "En revisión" con radicado.

**Perfil (`/pro/perfil`)** — datos, calificación, documentos, cerrar sesión.

### 9.4 Admin (dashboard responsivo)

**Indicadores (`/admin`)**
- **KPIs** (StatCard): Ingresos del mes, Servicios completados, Quickers activos, Calificación media (con variación %).
- **Gráfico de ingresos** (Recharts, barras 6 meses).
- **Dona** servicios por estado (completados/en curso/cancelados) + leyenda.
- **Quickers destacados** (top 3) y **servicios por zona** (barras de progreso).

**Gestionar Quickers (`/admin/quickers`)**
- Toolbar: buscador, filtro por estado (Tabs/segment), botón **Crear Quicker**.
- **DataTable** (TanStack Table): Quicker (avatar+nombre+doc), zona, estado (Badge), calificación (estrellas), servicios/mes, tarifa/h, **acciones** (ver, editar, pagar). Tabla con scroll horizontal en móvil.

**Crear Quicker (`/admin/quickers/nuevo`)**
- Form en 2 columnas (apila en móvil): foto (FileDrop), datos personales (nombre, doc, celular, email), operación (ciudad, zona, contrato — Select; tarifa/h), notas (Textarea). RHF + Zod. Guardar → vuelve a la tabla con toast de éxito.

**Pagar Quickers (`/admin/pagos`)**
- Selector de periodo (quincena/mes); tarjetas resumen (total a pagar, pendientes, comisión).
- Tabla de liquidación: Quicker, servicios, horas, bruto, deducciones, neto, estado, botón **Pagar** (con confirmación + loading → Badge "Pagado"). Botón "Pagar a todos".

**Facturación (`/admin/facturacion`)**
- Panel **Cuentas de cobro · Quickers**: documento, periodo, Quicker, valor, estado, descargar (simulado). Botón "Generar quincena".
- Panel **Facturas · Clientes**: número, cliente, periodo, valor, estado, ver.

---

## 10. Inventario de componentes reutilizables

| Componente | Uso | Notas |
|------------|-----|------|
| `Button` (shadcn) | global | variantes: primary, ghost, outline, success, sizes sm/md |
| `Input`, `Select`, `Textarea`, `Checkbox`, `RadioGroup`, `Switch` (shadcn) | formularios | foco con ring de marca |
| `DatePicker` (shadcn calendar + popover) | reserva, solicitudes | locale es |
| `Card`, `Badge`, `Avatar`, `Tabs`, `Dialog`, `Sheet`, `Tooltip`, `Skeleton`, `Sonner` | global | |
| `StatCard` | KPIs admin | icono + valor + delta |
| `DataTable` | tablas admin | TanStack Table + paginación/orden |
| `Stepper` | reserva | progreso 1–5 |
| `RatingStars` | calificar / tablas | interactivo y read-only |
| `PriceSummary` | reserva | desglose + total |
| `ServiceCard`, `BookingCard`, `AssignmentCard` | cliente/quicker | |
| `FileDrop` | crear quicker, solicitudes | preview de archivo (mock) |
| `MapView` | detalle servicio | MapLibre o SVG placeholder |
| `EmptyState`, `ErrorState`, `LoadingState` | global | |
| `RoleSwitcher` | demo | flotante, solo dev |

---

## 11. Responsividad y layout

- **Breakpoints Tailwind:** `sm 640 · md 768 · lg 1024 · xl 1280`.
- **Cliente/Quicker:** contenedor centrado `max-w-[1080px] mx-auto px-4 sm:px-6`. Grillas con `grid` + `auto-fit/minmax`. Filas de 2 columnas → 1 columna en `<md`.
- **Admin:** `grid-cols-[248px_1fr]` en `lg+`; en `<lg` el sidebar pasa a barra superior desplazable o se abre en `Sheet`. KPIs 4→2→1 columnas. Tablas en contenedor con `overflow-x-auto`.
- **Sin recortes:** todo contenedor con `box-border` y padding lateral; nada pegado al borde. Evitar overflow horizontal (`overflow-x-hidden` en el root).
- Probar a 360px, 768px, 1280px y 1440px.

---

## 12. Accesibilidad

- Labels asociados a inputs; `aria-*` en controles custom (estrellas, stepper, tabs).
- Foco visible (ring) en todo lo interactivo; navegación por teclado en formularios y tablas.
- Contraste AA (texto sobre azul/blanco). Targets táctiles ≥ 40px.
- Estados de carga/anuncios con `aria-live` donde aplique.

---

## 13. Pago simulado

- No integrar Wompi/Mercado Pago real. Simular: seleccionar método → "Pagar" → `setTimeout(1200ms)` con spinner → éxito → confirmación.
- Inputs de tarjeta con formato visual (número agrupado, vencimiento, CVV) pero sin validación de pasarela real.
- Dejar el componente `PaymentStep` aislado para enchufar la pasarela real después.

---

## 14. Formato y utilidades

```ts
// src/lib/format.ts
export const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
// fechas con date-fns + locale es
```

---

## 15. Plan de construcción por fases (checklist para Claude Code)

> Construir en este orden. Cada fase debe quedar navegable antes de pasar a la siguiente.

- [ ] **Fase 0 — Bootstrap**
  - [ ] Vite + React 19 + TS estricto; Tailwind v4; alias `@/`.
  - [ ] Tokens de marca en `globals.css`; fuentes Bricolage + Hanken.
  - [ ] shadcn/ui inicializado + componentes base generados.
  - [ ] Providers (QueryClient, Router). `RoleSwitcher` de demo.
- [ ] **Fase 1 — Capa mock + tipos**
  - [ ] `types.ts` (Zod), `db.ts` (seeds), `api.ts` (fake API con latencia).
  - [ ] Hooks con TanStack Query.
- [ ] **Fase 2 — Shells y ruteo**
  - [ ] ClientShell, QuickerShell, AdminShell (responsivos) + rutas.
  - [ ] Login/Registro funcionales (sesión en Zustand).
- [ ] **Fase 3 — Cliente**
  - [ ] Home → grilla + tarjetas de actividad.
  - [ ] Asistente de reserva (5 pasos) + recálculo de total + pago simulado + confirmación.
  - [ ] Mis servicios + calificar (estrellas interactivas).
- [ ] **Fase 4 — Quicker**
  - [ ] Hoy + balance del día; detalle de servicio con mapa.
  - [ ] Balance/historial; solicitudes (incapacidad + licencia) con subida de archivo mock.
- [ ] **Fase 5 — Admin**
  - [ ] Dashboard (KPIs + charts).
  - [ ] Quickers (DataTable) + crear Quicker (form).
  - [ ] Pagos + facturación.
- [ ] **Fase 6 — Pulido**
  - [ ] Estados vacío/error/loading en todo.
  - [ ] Toasts, microinteracciones, revisión responsive (360/768/1280).
  - [ ] Auditoría de accesibilidad; (opcional) E2E Playwright de los flujos clave.

---

## 16. Reglas para Claude Code (sugerido para `CLAUDE.md`)

- **No backend.** Toda data desde `src/mocks/api.ts`. No `fetch` a URLs reales.
- **Componentes de formulario = shadcn/ui.** Prohibido `<input>`/`<select>` con estilos caseros.
- **Tipado estricto.** Nada de `any`. Modelos validados con Zod.
- **Mobile-first y responsivo** en cada pantalla; sin overflow horizontal; sin contenido pegado al borde.
- **Marca:** azul (`brand-600`) + blanco; títulos en Bricolage Grotesque.
- **Data siempre vía TanStack Query** (para migración futura a API real cambiando solo `api.ts`).
- **Una fase a la vez**; deja cada fase navegable y commitea.
- Mantén componentes pequeños y reutilizables (`components/shared`).

### Prompts de arranque sugeridos
1. "Lee `docs/BUILD.md`. Ejecuta la **Fase 0** completa y muéstrame el árbol de archivos resultante."
2. "Ejecuta la **Fase 1**: tipos Zod, seeds y fake API con TanStack Query. Incluye datos semilla realistas en COP."
3. "Ejecuta la **Fase 2**: shells responsivos por rol, ruteo y login/registro con selector de rol demo."
4. …continúa fase por fase.

---

## 17. Definición de "terminado" (DoD)

- Los **tres roles** son navegables de punta a punta con datos mock.
- Cliente: puede agendar 4/6/8h, ver el total correcto, "pagar" y **calificar**.
- Quicker: ve servicios con valor y balance, sube incapacidad y solicita licencia.
- Admin: ve indicadores, crea/gestiona Quickers, paga y factura.
- **Responsive** real (sin recortes) en 360/768/1280.
- Componentes modernos (shadcn), estados de carga/vacío/error presentes.
- Migrar a backend = reemplazar `src/mocks/api.ts` por llamadas reales (mismos tipos).

---

### Anexo · datos semilla de referencia
- **Quickers:** Diana Rojas (Engativá, 5.0, 45 svc), Carolina Méndez (Chapinero, 4.9, 42), Jorge Patiño (Suba, 4.7, 38), Andrés Gómez (Kennedy, 4.6, 31), Luisa Fernanda Gil (Usaquén, incapacidad), Marcela Ríos (Chapinero, inactivo).
- **KPIs demo:** ingresos mes $236.4M, servicios completados 1.284, Quickers activos 48, calificación media 4.8.
- **Pagos:** netos entre $0.7M y $3.2M por quincena; comisión plataforma ~7%.
- **Facturas:** FE-001245 Conjunto Altos del Parque $8.64M (pagada), FE-001246 Inmobiliaria Bonanza $5.22M (pendiente), FE-001247 Ana López $116.800 (pagada).
