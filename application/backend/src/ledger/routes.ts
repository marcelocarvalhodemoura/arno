import { Router } from "express";
import { z } from "zod";
import { getAuth } from "../shared/auth/auth.js";
import { loadDb, mutate } from "../shared/persistence/finance-store.js";
import type { BranchId } from "../shared/types.js";
import { usersById, withAuthors } from "../shared/http/presenters.js";
import { createTransactionBody, patchTransactionBody } from "../shared/http/schemas.js";
import { errorMessage } from "../shared/http/errors.js";
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from "./transactions.js";
import { splitTransaction } from "./split.js";
import { configuredNotifyChannels, notifyTransaction, summarizeDeliveries } from "../notifications/notify.js";

export const ledgerRouter = Router();

ledgerRouter.get("/transactions", async (req, res) => {
  const db = await loadDb();
  const users = await usersById();
  const list = listTransactions(db, {
    from: (req.query.from as string) ?? "2000-01-01",
    to: (req.query.to as string) ?? "2100-12-31",
    branch: req.query.branch as BranchId | undefined,
    type: req.query.type as "income" | "expense" | undefined,
    nature: req.query.nature as "fixed" | "variable" | undefined,
  });
  res.json(
    list.map((tx) => ({
      ...withAuthors(tx, users),
      movementType: db.movementTypes.find((item) => item.id === tx.movementTypeId) ?? null,
      member: tx.memberId ? (db.members.find((member) => member.id === tx.memberId) ?? null) : null,
      account: tx.memberAccountId
        ? (db.memberAccounts.find((account) => account.id === tx.memberAccountId) ?? null)
        : null,
      guardian: tx.memberGuardianId
        ? ((db.memberGuardians ?? []).find((item) => item.id === tx.memberGuardianId) ?? null)
        : null,
    })),
  );
});

ledgerRouter.post("/transactions", async (req, res) => {
  const parsed = createTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const created = await mutate((db) => createTransaction(db, parsed.data, getAuth(req).userId));
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível lançar") });
  }
});

ledgerRouter.patch("/transactions/:id", async (req, res) => {
  const parsed = patchTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const auth = getAuth(req);
  try {
    const updated = await mutate((db) => updateTransaction(db, req.params.id, parsed.data, auth.userId));
    if (!updated) {
      res.status(404).json({ error: "Lançamento não encontrado" });
      return;
    }
    if (updated.shouldNotify && updated.tx.memberId) {
      const channels = configuredNotifyChannels();
      if (channels.length) {
        const db = await loadDb();
        const notify = summarizeDeliveries(await notifyTransaction(db, updated.tx, "receipt", channels, auth.userId));
        res.json({ ...updated.tx, notify });
        return;
      }
    }
    res.json(updated.tx);
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível alterar") });
  }
});

ledgerRouter.delete("/transactions/:id", async (req, res) => {
  const ok = await mutate((db) => deleteTransaction(db, req.params.id));
  if (!ok) {
    res.status(404).json({ error: "Lançamento não encontrado" });
    return;
  }
  res.status(204).end();
});

ledgerRouter.post("/transactions/:id/split", async (req, res) => {
  const parsed = z
    .object({
      parts: z
        .array(
          z.object({
            amount: z.number().positive(),
            movementTypeId: z.string().min(1),
            description: z.string().min(2),
            projectId: z.string().nullable().optional(),
            memberId: z.string().nullable().optional(),
          }),
        )
        .min(2),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe pelo menos duas partes com valor, tipo e descrição" });
    return;
  }
  try {
    const created = await mutate((db) => splitTransaction(db, req.params.id, parsed.data.parts, getAuth(req).userId));
    res.json(created);
  } catch (error) {
    res.status(400).json({ error: errorMessage(error, "Não foi possível ratear o lançamento") });
  }
});
