# QuickClean — Spec de diseño (frontend funcional, demo de los 3 roles)

**Fecha:** 2026-06-06
**Estado:** aprobado por el usuario (brainstorming)
**Documento fuente:** `QuickClean-Frontend-Build.md` (BUILD doc detallado). Esta spec lo consolida y fija las decisiones tomadas en brainstorming. Ante cualquier detalle no cubierto aquí, manda el BUILD doc.

---

## 1. Objetivo

Construir el **frontend funcional** de QuickClean (servicio de aseo a domicilio) para **presentar la idea**: una SPA navegable con **datos mock**, los **3 perfiles completos sin funcionalidades incompletas**, diseño **moderno y minimalista** y navegación con el **menor número de clics**. Sin backend (capa mock tipada con latencia simulada). Migrar a backend real = cambiar solo `src/mocks/api.ts`.

## 2. Alcance (decidido)

Cobertura **completa** de los 3 roles. Ninguna pantalla queda como placeholder vacío; todos los flujos terminan en un estado real (éxito / confirmación / estado vacío con sentido).

- **Cliente:** Home → Reserva (wizard 5 pasos, total recalculado) → Pago simulado → Confirmación con Quicker asignado → Mis servicios → Calificar (estrellas interactivas + propina).
- **Quicker:** Hoy (balance del día + servicios) → Detalle de servicio (mapa + check-in/out) → Balance/historial → Solicitudes (incapacidad + licencia, con subida de archivo mock) → Perfil.
- **Admin:** Indicadores (KPIs + charts Recharts) → Quickers (DataTable) → Crear Quicker (form) → Pagar Quickers (liquidación) → Facturación (cuentas de cobro + facturas).

## 3. Decisiones de diseño (brainstorming)

1. **Entrada y cambio de rol — RoleSwitcher persistente.**
   - Login simple con botones "Entrar como Cliente / Quicker / Admin".
   - Selector de rol **siempre visible** (arriba-derecha) que cambia entre Cliente / Quicker / Admin en **1 clic**, sin re-login. Es el mecanismo central para un pitch en vivo fluido.
   - El estado de sesión/rol vive en Zustand (`stores/session.ts`).
2. **Mínimos clics (sobre la spec base):**
   - CTAs primarios siempre visibles: "Agendar ahora" en Home; botón de pago/continuar fijo en el wizard.
   - Wizard de reserva con **resumen de precio pegado** (sticky) para no perder contexto entre pasos.
   - Navegación directa a la acción principal de cada rol al entrar.
3. **Minimalismo visual:** bordes finos (1px), radios sobrios (10–14px), sombras sutiles, mucho espacio en blanco, microinteracciones 150–250ms. Marca azul (`brand-600`) + blanco; títulos en Bricolage Grotesque, cuerpo en Hanken Grotesk.

## 4. Stack técnico

React 19 + TypeScript (estricto) · Vite 6 · Tailwind CSS v4 (`@theme`) · shadcn/ui (Radix) · TanStack Router + Query + Table · Zustand · Zod + React Hook Form · Recharts · lucide-react · MapLibre GL (o SVG placeholder en la 1ª pasada) · date-fns (locale `es`) · Vitest + Testing Library; Playwright E2E opcional en pulido.

## 5. Arquitectura y módulos

Estructura de carpetas según BUILD doc §3. Unidades con responsabilidad única y comunicación por interfaces claras:

- `mocks/` — `types.ts` (modelos + Zod), `db.ts` (seeds mutables en memoria), `api.ts` (fake API con latencia). Única fuente de datos.
- `stores/` — `session.ts` (rol/usuario), `booking.ts` (wizard).
- `hooks/` — wrappers de TanStack Query sobre `api.ts` (`useServices`, `useQuickers`, `usePayouts`, …).
- `components/ui` (shadcn generado) · `components/layout` (shells por rol) · `components/shared` (StatCard, RatingStars, Stepper, PriceSummary, FileDrop, MapView, EmptyState/ErrorState/LoadingState, RoleSwitcher).
- `features/{auth,client,quicker,admin}` — pantallas por dominio.
- `lib/` — `format.ts` (COP, fechas), `utils.ts` (`cn`, helpers).

**Flujo de datos:** UI → hook (TanStack Query) → `api.ts` (mock con delay) → `db.ts`. Mutaciones invalidan queries para reflejar cambios (reserva creada, payout pagado, etc.).

## 6. Reglas de negocio (precio cliente)

- Tarifas base: 4h $79.900 · 6h $109.900 · 8h $139.900.
- Implementos +$15.000; tarifa de plataforma $6.900.
- Descuentos por frecuencia: semanal −20%, quincenal −12%, mensual −8%, único 0%.
- `total = round(base * (1 - descuento)) + (supplies ? 15000 : 0) + 6900`.
- Pago al Quicker ≈ 70% del valor del servicio.

## 7. Estados y calidad

- Estados **siempre presentes**: loading (skeletons), vacío, error, hover, focus, disabled — en cada pantalla.
- Responsive real sin recortes a 360 / 768 / 1280 / 1440. Sin overflow horizontal.
- Accesibilidad: labels asociados, `aria-*` en controles custom (estrellas, stepper, tabs), foco visible, contraste AA, targets ≥ 40px.
- Pago **simulado** (sin pasarela real), `PaymentStep` aislado para enchufar Wompi después.

## 8. Plan de construcción por fases

Según BUILD doc §15. Cada fase queda navegable y se commitea antes de la siguiente:

0. **Bootstrap** — Vite+React19+TS, Tailwind v4 + tokens, fuentes, shadcn/ui base, providers, `CLAUDE.md` del proyecto (reglas §16), RoleSwitcher demo.
1. **Capa mock + tipos** — `types.ts`, `db.ts`, `api.ts`, hooks Query.
2. **Shells y ruteo** — ClientShell/QuickerShell/AdminShell responsivos + rutas + login/registro.
3. **Cliente** — home, wizard de reserva + pago + confirmación, mis servicios, calificar.
4. **Quicker** — hoy + balance, detalle con mapa, balance/historial, solicitudes.
5. **Admin** — dashboard (KPIs+charts), quickers (tabla) + crear, pagos, facturación.
6. **Pulido** — estados vacío/error/loading, toasts, microinteracciones, responsive, accesibilidad, (opcional) E2E.

## 9. Definición de "terminado" (DoD)

- Los 3 roles navegables de punta a punta con mock data, **sin funcionalidades incompletas**.
- Cliente agenda 4/6/8h con total correcto, "paga" y califica.
- Quicker ve servicios con valor y balance, sube incapacidad y solicita licencia.
- Admin ve indicadores, crea/gestiona Quickers, paga y factura.
- RoleSwitcher cambia de perfil en 1 clic.
- Responsive sin recortes (360/768/1280); componentes shadcn modernos; estados de carga/vacío/error presentes.
- Migrar a backend = reemplazar `src/mocks/api.ts`.

## 10. Skills a aplicar

- `frontend-design` + `ui-ux-pro-max` — acabado visual moderno/minimalista.
- `vercel-react-best-practices` + `vercel-composition-patterns` — calidad de componentes React 19.
- `web-design-guidelines` + `accessibility-auditor` — auditoría en fase de pulido.
- `deploy-to-vercel` — publicar la demo (link compartible) al final.
