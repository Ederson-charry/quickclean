# QuickClean — Reglas del proyecto

> Plataforma de producción del ecosistema SmartQuick. **Monorepo pnpm** con
> backend real. (Antes era una SPA demo sin backend; ese pivote se ejecuta en
> `feat/fundacion-seguridad`, plan en `docs/superpowers/plans/`.)

## Estructura

- **Monorepo pnpm** (`pnpm-workspace.yaml`):
  - `apps/web` — front React (Vite) actual, **no se reescribe**, solo evoluciona.
  - `apps/api` — API **NestJS** (Postgres vía **Prisma**), modular: Guards (RBAC/2FA), Interceptors.
  - `packages/shared` — schemas **Zod** + tipos compartidos entre web y api.
- Comandos desde la raíz: `pnpm dev:web`, `pnpm dev:api`, `pnpm db:up`, `pnpm -r test`.

## Backend / datos

- **Backend real**, no mocks. El front consume la API por `apps/web/src/lib/http.ts`
  (`apiFetch`), nunca `fetch` a URLs hardcodeadas ni a servicios de terceros directos.
- **Data en el front siempre vía TanStack Query**; la capa de transporte es `http.ts`.
- **Contratos compartidos:** todo input/output validado con Zod desde `@quickclean/shared`
  (mismo schema en web y api). Migrar tipos a `packages/shared` antes de duplicarlos.

## Calidad

- **TDD**: test que falla → implementación → verde. **Vitest** en web, api y shared.
- **TypeScript estricto.** Nada de `any`.
- **Seguridad primero** (Habeas Data Ley 1581, base ISO 27001): argon2id, JWT access +
  refresh rotatorio, RBAC por permisos, 2FA TOTP, política 90/90, lockout, Turnstile.
  Nunca loguear secretos/tokens/contraseñas. Respuestas de auth uniformes (anti-enumeración).
- **Una fase a la vez**; deja cada fase navegable, con tests verdes, y commitea.

## UI (apps/web)

- **Formularios = shadcn/ui** + react-hook-form + `zodResolver`. Prohibido `<input>`/`<select>` casero.
- **Mobile-first y responsivo** en cada pantalla; sin overflow horizontal; nada pegado al borde.
- **Marca:** azul (`brand-600`) + blanco; títulos en Bricolage Grotesque.
- Componentes pequeños y reutilizables en `apps/web/src/components/shared`.
- Dinero con `cop()` de `@/lib/format`. Fechas con date-fns locale `es`.
