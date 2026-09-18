import { Router } from "express";
import { z } from "zod";
import { getAuth } from "../shared/auth/auth.js";
import { loadDb, mutate } from "../shared/persistence/finance-store.js";
import { buildMensalidadeReport, syncMensalidades } from "./mensalidades.js";
import { collectMensalidadeNotifyIds, notifyMensalidadeTransactions } from "./notify.js";
import { configuredNotifyChannels } from "../notifications/notify.js";

export const mensalidadesRouter = Router();

mensalidadesRouter.get("/mensalidades", async (req, res) => {
  const year = Number(req.query.year ?? new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    res.status(400).json({ error: "Informe um ano válido" });
    return;
  }
  const report = await mutate((db) => {
    syncMensalidades(db, year, getAuth(req).userId);
    return buildMensalidadeReport(db, year);
  });
  res.json(report);
});

mensalidadesRouter.post("/mensalidades/notify", async (req, res) => {
  const parsed = z
    .object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12).optional(),
      kind: z.enum(["charge", "receipt"]),
      memberIds: z.array(z.string()).optional(),
      transactionIds: z.array(z.string()).optional(),
      channels: z
        .array(z.enum(["email", "whatsapp"]))
        .min(1)
        .optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe o ano, o tipo (cobrança ou comprovante) e os destinatários" });
    return;
  }
  const channels = parsed.data.channels?.length ? parsed.data.channels : configuredNotifyChannels();
  if (!channels.length) {
    res.status(400).json({ error: "Configure e-mail (MAIL_HOST) ou WhatsApp para disparar mensagens" });
    return;
  }
  const report = await mutate((db) => {
    syncMensalidades(db, parsed.data.year, getAuth(req).userId);
    return buildMensalidadeReport(db, parsed.data.year);
  });
  const db = await loadDb();
  const txIds = collectMensalidadeNotifyIds(report, parsed.data);
  res.json(await notifyMensalidadeTransactions(db, txIds, parsed.data.kind, channels, getAuth(req).userId));
});
