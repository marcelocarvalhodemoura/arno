import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
    env: {
      DATABASE_URL: "postgres://arno:arno1991@127.0.0.1:5434/tesouraria_test",
      AUTH_SECRET: "test-secret",
    },
  },
});
