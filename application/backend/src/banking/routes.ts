import { Router } from "express";
import { z } from "zod";
import { getAuth } from "../shared/auth/auth.js";
import { errorMessage } from "../shared/http/errors.js";
import { registerPixWebhook, sicrediStatus, simulatedPix, webhookTokenOk } from "./sicredi.js";
import { ingestWebhookPix, sicrediOverview, syncSicrediPix } from "./sicredi-sync.js";

export const bankingPublicRouter = Router();
export const bankingRouter = Router();

bankingPublicRouter.post("/integrations/sicredi/webhook", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;
  if (!webhookTokenOk(token)) {
    res.status(401).json({ error: "Webhook não autorizado" });
    return;
  }
  try {
    const result = await ingestWebhookPix(req.body);
    res.json({ ok: true, fetched: result.fetched, created: result.created, paid: result.paid });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível registrar o Pix") });
  }
});

function periodQuery(req: { query: { from?: unknown; to?: unknown } }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const from = typeof req.query.from === "string" && req.query.from ? req.query.from : `${today.slice(0, 8)}01`;
  const to = typeof req.query.to === "string" && req.query.to ? req.query.to : today;
  return { from, to };
}

bankingRouter.get("/integrations/sicredi", async (req, res) => {
  const { from, to } = periodQuery(req);
  try {
    res.json(await sicrediOverview(from, to));
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível ler o Sicredi") });
  }
});

bankingRouter.post("/integrations/sicredi/sync", async (req, res) => {
  const parsed = z
    .object({
      from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Informe um período válido" });
    return;
  }
  try {
    res.json(
      await syncSicrediPix({
        from: parsed.data.from,
        to: parsed.data.to,
        userId: getAuth(req).userId,
      }),
    );
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível sincronizar o Sicredi") });
  }
});

bankingRouter.post("/integrations/sicredi/simulate", async (req, res) => {
  if (!sicrediStatus().mock) {
    res.status(400).json({ error: "A simulação só funciona com SICREDI_MOCK=1" });
    return;
  }
  try {
    res.json(
      await syncSicrediPix({
        userId: getAuth(req).userId,
        pix: [simulatedPix()],
      }),
    );
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível simular o Pix") });
  }
});

bankingRouter.post("/integrations/sicredi/webhook/register", async (_req, res) => {
  try {
    res.json(await registerPixWebhook());
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível registrar o webhook") });
  }
});
