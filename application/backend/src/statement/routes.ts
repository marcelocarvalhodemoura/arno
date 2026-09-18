import { Router } from "express";
import { z } from "zod";
import { getAuth } from "../shared/auth/auth.js";
import { mutate } from "../shared/persistence/finance-store.js";
import { errorMessage } from "../shared/http/errors.js";
import { ingestTransactions } from "./ingest.js";
import { interpretUploadedStatement } from "./interpret-upload.js";
import { remapImportCsv } from "./import-map.js";
import { aiConfigured } from "./statement-ai.js";
import { txImportRow } from "../shared/http/schemas.js";

export const statementRouter = Router();

statementRouter.post("/integrations/interpret-statement", async (req, res) => {
  const parsed = z
    .object({
      csv: z.string().min(1).max(1_500_000).optional(),
      pdf: z.string().min(1).max(10_000_000).optional(),
    })
    .refine((value) => Boolean(value.csv || value.pdf), "Envie o CSV ou o PDF do extrato")
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Envie o conteúdo do CSV ou do PDF do extrato" });
    return;
  }
  try {
    const result = await interpretUploadedStatement(parsed.data, getAuth(req).userId);
    res.json(result);
  } catch (error) {
    const message = errorMessage(error, "Não foi possível ler o extrato");
    res.status(400).json({ error: message });
  }
});

statementRouter.post("/integrations/map-import", async (req, res) => {
  const parsed = z
    .object({
      csv: z.string().min(1).max(1_500_000),
      kind: z.enum(["members", "statement"]),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Envie o conteúdo da planilha" });
    return;
  }
  const remapped = await remapImportCsv(parsed.data.csv, parsed.data.kind);
  res.json({
    csv: remapped.csv,
    usedAi: remapped.usedAi,
    aiAvailable: aiConfigured(),
    mapping: remapped.mapping,
    sample: remapped.sample,
    review: remapped.review,
  });
});

statementRouter.post("/integrations/transactions", async (req, res) => {
  const parsed = z.object({ rows: z.array(txImportRow).min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = await mutate((db) => ingestTransactions(db, parsed.data.rows, getAuth(req).userId, "integration"));
    res.json({
      created: result.created.length,
      paid: result.paid.length,
      unidentified: result.unidentified.length,
      skipped: result.skipped,
    });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível importar o extrato") });
  }
});
