import "./shared/env.js";
import { waitForDb } from "./shared/db.js";
import { migrate } from "./migrate.js";
import { seedIfEmpty } from "./shared/persistence/finance-store.js";
import { rehashLegacySeedUsers } from "./identity/users.js";
import { startOutboxWorker } from "./notifications/outbox.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

async function start() {
  await waitForDb();
  await migrate();
  await seedIfEmpty();
  const upgraded = await rehashLegacySeedUsers();
  if (upgraded > 0) {
    console.log(`Senhas de ${upgraded} usuário(s) inicial(is) regravadas em bcrypt`);
  }
  startOutboxWorker();
  app.listen(port, () => {
    console.log(`Tesouraria API em http://127.0.0.1:${port}`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar a API:", error);
  process.exit(1);
});
