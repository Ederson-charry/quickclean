import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/quickclean/ on GitHub Pages.
  // Local dev stays at "/" for convenience.
  base: command === "build" ? "/quickclean/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
