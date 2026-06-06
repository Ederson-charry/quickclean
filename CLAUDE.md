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
