import cors from "cors";
import express from "express";
import { router } from "./routes.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "arno-financeiro" });
  });

  app.use("/api", router);

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
