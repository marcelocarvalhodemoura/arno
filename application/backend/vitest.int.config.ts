import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
    // DATABASE_URL vem do .env e o setup troca o banco para tesouraria_test.
    env: {
      AUTH_SECRET: "test-secret",
    },
  },
});
