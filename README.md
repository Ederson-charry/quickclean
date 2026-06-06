# QuickClean

> **Demo funcional (frontend) de QuickClean** — plataforma de aseo a domicilio que conecta clientes con profesionales de limpieza ("Quickers"). Construida para **presentar la idea**: navegable de punta a punta, con datos simulados (mock) y diseño moderno y minimalista.

🔗 **Demo en vivo:** https://ederson-charry.github.io/quickclean/

---

## Qué es

QuickClean es una SPA que demuestra **tres experiencias completas** dentro de un mismo código, con un **selector de rol que cambia de perfil en 1 clic** (pensado para un pitch en vivo):

| Rol | Qué puede hacer |
|-----|-----------------|
| **Cliente** | Agenda un servicio de **4/6/8 horas** (asistente de 5 pasos con total en vivo), paga (simulado) y **califica** el servicio. |
| **Quicker** | Ve sus servicios del día con su valor y su **balance/ganancias**, abre el detalle con mapa, sube **incapacidades** y solicita **licencias**. |
| **Admin** | Revisa **indicadores** (KPIs + gráficos), **crea/gestiona** Quickers, **paga** liquidaciones y **factura**. |

Sin backend: toda la data vive en una capa mock tipada con latencia simulada. **Migrar a un backend real = reemplazar `src/mocks/api.ts`** (mismos tipos Zod).

## Cómo navegar la demo (≈3 min)

1. **Login** → "Entrar como Cliente / Quicker / Admin" (o usa el selector de rol persistente arriba a la derecha).
2. **Cliente:** Inicio → *Agendar ahora* → Aseo Hogar → Única → **6h** → fecha + dirección → Resumen → *Pagar* → confirmación con Quicker asignada. Luego califica el servicio pendiente.
3. **Quicker** (cambia con el selector): ve el servicio del día y el balance → abre el detalle (mapa) → sube una incapacidad.
4. **Admin** (cambia con el selector): indicadores y gráficos → crea un Quicker → paga una liquidación → facturación.

## Stack técnico

- **React 19** + **TypeScript** (estricto) + **Vite 6**
- **Tailwind CSS v4** (tokens de marca azul + blanco) + **shadcn/ui** (Radix/Base UI)
- **TanStack** Router · Query · Table
- **Zustand** (sesión/rol y asistente de reserva)
- **Zod** + **React Hook Form** (formularios y modelos)
- **Recharts** (dashboard) · **lucide-react** (íconos) · **date-fns** (fechas, locale es)
- **Vitest** + Testing Library (lógica de precios, fake API y stores)

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas unitarias
npm run build    # build de producción
```

## Estructura

```
src/
├─ app/         # providers + router (TanStack Router)
├─ components/
│  ├─ ui/       # shadcn/ui
│  ├─ layout/   # shells por rol (Client / Quicker / Admin) + RoleSwitcher
│  └─ shared/   # StatCard, RatingStars, Stepper, PriceSummary, DataTable, MapView, FileDrop, States…
├─ features/    # auth · client · quicker · admin (pantallas)
├─ hooks/       # wrappers de TanStack Query sobre la fake API
├─ mocks/       # types (Zod) · db (seeds) · api (fake API con latencia)
├─ stores/      # session · booking (Zustand)
└─ lib/         # pricing · format (COP, fechas) · utils
```

## Documentación

- Spec de diseño: [`docs/superpowers/specs/2026-06-06-quickclean-frontend-design.md`](docs/superpowers/specs/2026-06-06-quickclean-frontend-design.md)
- Plan de implementación: [`docs/superpowers/plans/2026-06-06-quickclean-frontend.md`](docs/superpowers/plans/2026-06-06-quickclean-frontend.md)
- Documento de construcción original: [`QuickClean-Frontend-Build.md`](QuickClean-Frontend-Build.md)

## Despliegue

Push a `main` dispara el workflow de **GitHub Pages** (`.github/workflows/deploy.yml`), que compila y publica `dist/` (con `404.html` para que el ruteo de la SPA funcione en enlaces profundos).

---

*Demo de producto — datos simulados, sin información real de clientes.*
