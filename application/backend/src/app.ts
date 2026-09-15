import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { router } from "./routes.js";

// Em produção a API também entrega a interface, para que o frontend continue
// chamando /api na mesma origem sem proxy nem CORS.
const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "arno-financeiro" });
  });

  app.use("/api", router);

  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // Roteamento do React Router: o que não é /api cai no index.html.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(join(frontendDist, "index.html"));
    });
  }

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: "Erro interno" });
    },
  );

  return app;
}
