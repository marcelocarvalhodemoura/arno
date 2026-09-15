import "./env.js";
import { waitForDb } from "./db.js";
import { migrate } from "./migrate.js";
import { seedIfEmpty } from "./store.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

async function start() {
  await waitForDb();
  await migrate();
  await seedIfEmpty();
  app.listen(port, () => {
    console.log(`Tesouraria API em http://127.0.0.1:${port}`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar a API:", error);
  process.exit(1);
});
