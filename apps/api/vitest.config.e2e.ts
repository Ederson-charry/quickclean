import path from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    setupFiles: ["./vitest.setup.ts"],
    pool: "forks",
    // DB compartida: cada archivo bootea AppModule (pool Prisma propio). Serializar
    // evita agotar las conexiones de Postgres ("too many clients") al crecer la suite.
    fileParallelism: false,
    testTimeout: 30_000,
    alias: {
      "@quickclean/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
