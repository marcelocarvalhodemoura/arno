import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { requireAuth } from "./shared/auth/auth.js";
import { identityPublicRouter, identityRouter } from "./identity/routes.js";
import { catalogRouter } from "./catalog/routes.js";
import { membersRouter } from "./members/routes.js";
import { ledgerRouter } from "./ledger/routes.js";
import { reportsRouter } from "./reports/routes.js";
import { projectsRouter } from "./projects/routes.js";
import { mensalidadesRouter } from "./mensalidades/routes.js";
import { statementRouter } from "./statement/routes.js";
import { bankingPublicRouter, bankingRouter } from "./banking/routes.js";
import { notificationsRouter, whatsappWebhookRouter } from "./notifications/routes.js";

const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "arno-financeiro" });
  });

  app.use("/webhook", whatsappWebhookRouter);
  app.use("/api", identityPublicRouter);
  app.use("/api", bankingPublicRouter);
  app.use("/api/integrations/whatsapp/webhook", whatsappWebhookRouter);
  app.use("/api", requireAuth);
  app.use("/api", identityRouter);
  app.use("/api", catalogRouter);
  app.use("/api", membersRouter);
  app.use("/api", ledgerRouter);
  app.use("/api", reportsRouter);
  app.use("/api", projectsRouter);
  app.use("/api", mensalidadesRouter);
  app.use("/api", statementRouter);
  app.use("/api", bankingRouter);
  app.use("/api", notificationsRouter);

  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(join(frontendDist, "index.html"));
    });
  }

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  });

  return app;
}
