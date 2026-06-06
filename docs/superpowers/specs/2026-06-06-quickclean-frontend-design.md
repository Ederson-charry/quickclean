# QuickClean — Spec de diseño (frontend funcional · demo de los 3 roles)

**Versión:** 2.0 · **Fecha:** 2026-06-06 · **Estado:** aprobado (brainstorming)
**Owner:** Ederson Charry (CTO) · **Ejecuta:** Claude Code
**Fuente de verdad técnica:** `QuickClean-Frontend-Build.md` (BUILD doc). Esta spec consolida y fija las decisiones; ante cualquier detalle no cubierto aquí, manda el BUILD doc.

> **TL;DR.** SPA navegable, sin backend (mock tipado con latencia), que demuestra **los 3 roles completos** (Cliente · Quicker · Admin) con diseño **moderno y minimalista** y **mínimos clics**. Cambio de rol en **1 clic** con un RoleSwitcher persistente. Migrar a backend real = reemplazar `src/mocks/api.ts`.

---

## 1. Objetivo

Construir el **frontend funcional** de QuickClean (aseo a domicilio) para **vender la idea en vivo**: cada rol se recorre de punta a punta, ningún flujo queda incompleto y todo termina en un estado real (éxito / confirmación / vacío con sentido). Prioridad: claridad, velocidad de demo y acabado visual.

## 2. Alcance y no-objetivos

**Dentro (cobertura completa de los 3 roles):**
- **Cliente:** Home → Reserva (wizard 5 pasos, total recalculado) → Pago simulado → Confirmación con Quicker asignado → Mis servicios → Calificar (estrellas + propina).
- **Quicker:** Hoy (balance del día + servicios) → Detalle (mapa + check-in/out) → Balance/historial → Solicitudes (incapacidad + licencia, subida de archivo mock) → Perfil.
- **Admin:** Indicadores (KPIs + charts) → Quickers (DataTable) → Crear Quicker → Pagar (liquidación) → Facturación (cuentas de cobro + facturas).

**Fuera (no-objetivos, explícito):**
- Backend, base de datos, auth real, pasarela de pago real, push/SMS/correo reales.
- Multi-idioma (solo español CO), modo oscuro, internacionalización de moneda.
- Persistencia entre recargas (la data mock vive en memoria y se reinicia; aceptable para demo).
- Optimización SEO/SSR (es una SPA de demo).

## 3. Decisiones de diseño (fijadas)

1. **Entrada y cambio de rol — RoleSwitcher persistente.**
   - Login simple: "Entrar como Cliente / Quicker / Admin".
   - Selector de rol **siempre visible** (arriba-derecha del shell) que alterna Cliente/Quicker/Admin en **1 clic**, sin re-login. Es el eje de un pitch fluido. Estilo discreto (segmented control), **no** debe parecer un banner de "mockup".
   - Sesión/rol en Zustand (`stores/session.ts`).
2. **Mínimos clics (operacionalizado en §6):** CTAs primarios siempre visibles; resumen de precio **sticky** en el wizard; al entrar a cada rol se aterriza directo en su acción principal.
3. **Minimalismo visual:** bordes finos (1px), radios 10–14px, sombras sutiles, espacio en blanco generoso, microinteracciones 150–250ms. Azul `brand-600` + blanco; display Bricolage Grotesque, cuerpo Hanken Grotesk.
4. **Componentes = shadcn/ui.** Prohibido `<input>`/`<select>` caseros (causa raíz del look "anticuado" en intentos previos).

## 4. Stack técnico

React 19 + TypeScript (estricto) · Vite 6 · Tailwind v4 (`@theme`) · shadcn/ui (Radix) · TanStack Router + Query + Table · Zustand · Zod + React Hook Form · Recharts · lucide-react · MapLibre GL (o SVG placeholder en la 1ª pasada) · date-fns (`es`) · Vitest + Testing Library; Playwright E2E opcional en pulido.

## 5. Sistema visual (tokens — self-contained)

```css
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
```
Escala tipográfica: H1 28–34 / H2 20–22 / H3 16 / body 14–15 / caption 12. Inputs ~44px con foco `ring-2 ring-brand-500/30`.

## 6. Mapa de navegación + presupuesto de clics

| Ruta | Rol | Pantalla | Clics desde el inicio del rol |
|------|-----|----------|------------------------------|
| `/login` `/registro` | Auth | Acceso / alta | — |
| `/app` | Cliente | Home | 0 |
| `/app/reservar` | Cliente | Wizard reserva (5 pasos, total sticky) | 1 (CTA "Agendar ahora") |
| `/app/servicios` | Cliente | Mis servicios | 1 |
| `/app/servicios/:id/calificar` | Cliente | Calificar | 2 |
| `/pro` | Quicker | Hoy (balance + servicios) | 0 |
| `/pro/servicio/:id` | Quicker | Detalle (mapa, check-in/out) | 1 |
| `/pro/balance` | Quicker | Ganancias / historial | 1 |
| `/pro/solicitudes` | Quicker | Incapacidad / Licencia | 1 |
| `/pro/perfil` | Quicker | Perfil | 1 |
| `/admin` | Admin | Indicadores | 0 |
| `/admin/quickers` (`/nuevo`) | Admin | Gestionar / Crear Quicker | 1 (2 para crear) |
| `/admin/pagos` | Admin | Pagar | 1 |
| `/admin/facturacion` | Admin | Facturación | 1 |

**Reglas de clics:** cambiar de rol = 1 clic (RoleSwitcher). Acción principal de cada rol ≤ 1 clic desde su home. Completar una reserva ≤ 6 interacciones (1 por paso + pagar). Calificar ≤ 3 toques (estrellas → enviar).

## 7. Modelo de datos (snapshot — detalle en BUILD §5)

`User{role}` · `Service{type,name,basePrice}` · `Booking{type,size,frequency,duration(4|6|8),supplies,date,time,address,total,status,quickerId,rated}` · `Quicker{name,doc,zone,contract,hourlyRate,status,rating,monthlyServices}` · `ServiceAssignment{clientName,address,time,durationHours,payout,status}` · `Payout{period,services,hours,gross,deductions,net,status}` · `Invoice{number,client,period,amount,status}` · `Rating{stars,tags,comment,tip}` · `LeaveRequest{kind(incapacidad|licencia_remunerada|licencia_no_remunerada),reason,from,to,fileName,status}`. Todos con esquema **Zod** en `mocks/types.ts`.

## 8. Arquitectura y flujo de datos

Estructura según BUILD §3. Responsabilidad única + interfaces claras:
- `mocks/` — `types.ts`, `db.ts` (seeds mutables), `api.ts` (fake API con delay). **Única** fuente de datos.
- `stores/` — `session.ts` (rol/usuario), `booking.ts` (wizard: paso, data, `total()`).
- `hooks/` — wrappers TanStack Query sobre `api.ts`.
- `components/{ui,layout,shared}` · `features/{auth,client,quicker,admin}` · `lib/{format,utils}`.

**Flujo:** UI → hook (Query) → `api.ts` (delay) → `db.ts`. Las mutaciones **invalidan queries** para reflejar cambios (reserva creada, payout pagado, licencia enviada).

## 9. Reglas de negocio (precio cliente)

- Base: 4h $79.900 · 6h $109.900 · 8h $139.900.
- Implementos +$15.000; tarifa de plataforma $6.900.
- Descuentos por frecuencia: semanal −20%, quincenal −12%, mensual −8%, único 0%.
- `total = round(base * (1 - descuento)) + (supplies ? 15000 : 0) + 6900`.
- Pago al Quicker ≈ 70% del valor del servicio (para el balance).

## 10. Datos semilla (demo creíble)

- **Quickers:** Diana Rojas (Engativá, 5.0, 45), Carolina Méndez (Chapinero, 4.9, 42), Jorge Patiño (Suba, 4.7, 38), Andrés Gómez (Kennedy, 4.6, 31), Luisa Fernanda Gil (Usaquén, incapacidad), Marcela Ríos (Chapinero, inactivo).
- **Reservas:** 1 agendada (Jue 12 jun, 6h, Carolina), 1 pendiente por calificar (5 jun), 1 completada.
- **KPIs:** ingresos mes $236.4M · servicios 1.284 · Quickers activos 48 · rating 4.8.
- **Pagos:** netos $0.7M–$3.2M/quincena, comisión ~7%. **Facturas:** FE-001245 Conjunto Altos $8.64M (pagada), FE-001246 Inmobiliaria Bonanza $5.22M (pendiente), FE-001247 Ana López $116.800 (pagada).

## 11. Guion de demo (pitch en vivo, ~3 min)

> Recorrido óptimo para mostrar todo con mínimos clics. El RoleSwitcher conecta los tres actos.

1. **Cliente (agendar):** `/app` → "Agendar ahora" → Aseo Hogar → Única → **6h** → Jue 12, 8:00 a.m. + dirección → Resumen (total se arma solo) → **Pagar** (Tarjeta) → Confirmación con Carolina asignada.
2. **Cliente (calificar):** Home → "Pendiente por calificar" → 5 estrellas + chips + propina $5.000 → Enviar → gracias.
3. **RoleSwitcher → Quicker:** `/pro` muestra el servicio recién "agendado" con su valor y el **balance del día** → abrir Detalle (mapa) → Solicitudes → subir **incapacidad** (mock) → "En revisión".
4. **RoleSwitcher → Admin:** `/admin` (KPIs + gráficos) → Quickers (tabla) → **Crear Quicker** (form) → Pagos → **Pagar** a Carolina (loading → "Pagado") → Facturación.

**Éxito de la demo:** los 3 roles se sienten reales, los números cuadran, y nada queda "por construir".

## 12. Estados y calidad

- Estados **siempre presentes**: loading (skeletons), vacío, error, hover, focus, disabled.
- Responsive real **sin recortes** a 360 / 768 / 1280 / 1440; sin overflow horizontal; nada pegado al borde (padding lateral + `box-border`).
- Accesibilidad: labels asociados, `aria-*` en controles custom (estrellas, stepper, tabs), foco visible, contraste AA, targets ≥ 40px.
- Pago **simulado**; `PaymentStep` aislado para enchufar Wompi luego.
- Presupuesto de rendimiento: bundle inicial < 300 KB gz; TTI < 2.5 s en la demo.

## 13. Flujo de skills (cadena por fase)

Reusar la cadena obligatoria del workflow, **con `frontend-design` al frente del diseño** para esta marca:

| Fase | Skill(s) | Resultado |
|------|----------|-----------|
| 1 · Plan | `superpowers` | Plan con pasos, riesgos, dependencias |
| 2 · Diseño | **`frontend-design`** + `ui-ux-pro-max` | UI moderna/minimalista, paleta **azul/blanco** (no la dorada de SmartQuick) |
| 3 · Implementar | `code-simplifier` (+ `vercel-react-best-practices`, `vercel-composition-patterns`) | Componentes React 19 simples y bien compuestos |
| 4 · Test | `playwright-e2e` | E2E de los flujos clave de cada rol |
| 5 · Auditar | `accessibility-auditor` (+ `web-design-guidelines`) | WCAG 2.1 AA, 0 críticos |
| 6 · Persistir | `claude-mem` | Decisiones y siguiente paso entre sesiones |
| Entrega | `deploy-to-vercel` | Link compartible de la demo |

> Nota: si algún skill no carga, **detente y avisa** (no continúes en modo degradado). La paleta de marca para QuickClean es **azul + blanco**.

## 14. Plan de construcción por fases (checklist)

0. **Bootstrap** — Vite+React19+TS · Tailwind v4 + tokens (§5) · fuentes · shadcn/ui base · providers · `CLAUDE.md` (reglas BUILD §16) · RoleSwitcher demo.
1. **Capa mock + tipos** — `types.ts`, `db.ts` (seeds §10), `api.ts`, hooks Query.
2. **Shells y ruteo** — ClientShell/QuickerShell/AdminShell responsivos · rutas (§6) · login/registro.
3. **Cliente** — home · wizard + pago + confirmación · mis servicios · calificar.
4. **Quicker** — hoy + balance · detalle con mapa · balance/historial · solicitudes.
5. **Admin** — dashboard (KPIs+charts) · quickers (tabla) + crear · pagos · facturación.
6. **Pulido** — estados vacío/error/loading · toasts · microinteracciones · responsive (§12) · accesibilidad · (opcional) E2E · deploy.

Cada fase queda **navegable** y se commitea antes de la siguiente.

## 15. Definición de "terminado" (DoD)

- [ ] 3 roles navegables de punta a punta con mock data, **sin funcionalidades incompletas**.
- [ ] Cliente agenda 4/6/8h con total correcto, "paga" y califica.
- [ ] Quicker ve servicios con valor y balance, sube incapacidad y solicita licencia.
- [ ] Admin ve indicadores, crea/gestiona Quickers, paga y factura.
- [ ] RoleSwitcher cambia de perfil en 1 clic.
- [ ] Guion de demo (§11) se ejecuta sin baches.
- [ ] Responsive sin recortes (360/768/1280/1440); componentes shadcn modernos; estados loading/vacío/error presentes; accesibilidad AA.
- [ ] Migrar a backend = reemplazar `src/mocks/api.ts` (mismos tipos Zod).

## 16. Supuestos y riesgos

- **Supuestos:** data en memoria (se reinicia al recargar) es aceptable para el pitch; los skills `vercel-*` y `deploy-to-vercel` están instalados en el entorno de Claude Code; imágenes/avatares pueden ser remotas con fallback a degradado si la red las bloquea.
- **Riesgos / mitigación:** (a) imágenes externas que no cargan → usar fallback de marca; (b) MapLibre añade peso → arrancar con SVG placeholder y cambiar luego; (c) alcance de 3 roles es amplio → respetar el orden por fases y no pulir hasta tener todo navegable.
