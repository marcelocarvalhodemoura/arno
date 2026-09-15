import "../../src/env.js";
import { TEST_ADMIN_USER, TEST_PASSWORD, TEST_TREASURER_USER } from "./credentials.js";

const configured = process.env.DATABASE_URL;
if (!configured) {
  throw new Error(
    "DATABASE_URL não definida. Copie application/.env.example para application/.env antes de rodar os testes.",
  );
}

// Os testes rodam sempre no banco tesouraria_test, derivado da conexão do .env.
process.env.DATABASE_ADMIN_URL ??= configured;
process.env.DATABASE_URL = configured.replace(/\/[^/?]+(\?.*)?$/, "/tesouraria_test$1");
process.env.AUTH_SECRET ??= "test-secret";
process.env.ADMIN_USER = TEST_TREASURER_USER;
process.env.ADMIN_PASSWORD = TEST_PASSWORD;

import { ensureTestDatabase } from "./ensure-db.js";

await ensureTestDatabase();
const { pool, waitForDb } = await import("../../src/db.js");
const { migrate } = await import("../../src/migrate.js");
const { seedIfEmpty } = await import("../../src/store.js");
const { hashPassword } = await import("../../src/password.js");
await waitForDb(10);
await migrate();
await seedIfEmpty();

// Garante a senha de teste mesmo em um banco de teste já semeado antes.
await pool.query("UPDATE users SET password_hash = $1 WHERE username = ANY($2)", [
  await hashPassword(TEST_PASSWORD),
  [TEST_ADMIN_USER, TEST_TREASURER_USER],
]);
