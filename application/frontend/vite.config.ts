import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(dir, "../shared/types.ts"),
    },
  },
  server: {
    port: 5174,
    host: "127.0.0.1",
    fs: { allow: [".."] },
    proxy: {
      "/api": "http://127.0.0.1:4000",
    },
  },
});
