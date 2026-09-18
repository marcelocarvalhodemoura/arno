import { Router } from "express";
import { handleWhatsAppEvents, hubChallenge, isWhatsAppAccount, verifyWebhook } from "./whatsapp.js";
import { listNotifications, notifyStatus } from "./notify.js";
import { countQueued } from "./outbox.js";

export const notificationsRouter = Router();
export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/", (req, res) => {
  const { mode, token, challenge } = hubChallenge(req.query as Record<string, unknown>);
  if (!mode && !token && !challenge) {
    res.json({ ok: true, service: "whatsapp-webhook" });
    return;
  }
  if (!verifyWebhook(mode, token)) {
    res.sendStatus(403);
    return;
  }
  res.status(200).type("text/plain").send(challenge);
});

whatsappWebhookRouter.post("/", (req, res) => {
  if (!isWhatsAppAccount(req.body)) {
    console.log("Evento recebido:", JSON.stringify(req.body, null, 2));
    res.sendStatus(404);
    return;
  }
  try {
    handleWhatsAppEvents(req.body);
  } catch (error) {
    console.error("WhatsApp webhook:", error);
  }
  res.status(200).type("text/plain").send("EVENT_RECEIVED");
});

notificationsRouter.get("/notify/status", async (_req, res) => {
  res.json({ ...notifyStatus(), queued: await countQueued() });
});

notificationsRouter.get("/notify/log", async (req, res) => {
  const limit = Number(req.query.limit ?? 40);
  res.json(await listNotifications(Number.isFinite(limit) ? limit : 40));
});
