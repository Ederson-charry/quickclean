import path from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    setupFiles: ["./vitest.setup.ts"],
    pool: "forks",
    // Los specs de integración comparten una sola DB; correrlos en serie evita
    // carreras entre archivos (cadena de auditoría, datos compartidos).
    fileParallelism: false,
    alias: {
      "@quickclean/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  plugins: [
    // SWC emite los metadatos de decoradores que NestJS necesita para la DI.
    swc.vite({ module: { type: "es6" } }),
  ],
});
