process.env.DATABASE_URL ??= "postgres://arno:arno1991@127.0.0.1:5434/tesouraria_test";
process.env.AUTH_SECRET ??= "test-secret";

import { ensureTestDatabase } from "./ensure-db.js";

await ensureTestDatabase();
const { waitForDb } = await import("../../src/db.js");
const { migrate } = await import("../../src/migrate.js");
const { seedIfEmpty } = await import("../../src/store.js");
await waitForDb(10);
await migrate();
await seedIfEmpty();
