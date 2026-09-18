import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../shared/auth/auth.js";
import { loadDb } from "../shared/persistence/finance-store.js";
import { cashFlow, customReport, dashboard } from "./finance.js";
import { branch, nature, txType } from "../shared/http/schemas.js";
import { authorOf, usersById } from "../shared/http/presenters.js";

export const reportsRouter = Router();

reportsRouter.get("/dashboard", requireRole("admin"), async (req, res) => {
  const year = Number(req.query.year ?? new Date().getFullYear());
  const month = Number(req.query.month ?? new Date().getMonth() + 1);
  res.json(dashboard(await loadDb(), year, month));
});

reportsRouter.get("/reports/cashflow", async (req, res) => {
  const from = (req.query.from as string) ?? `${new Date().getFullYear()}-01-01`;
  const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);
  res.json(cashFlow(await loadDb(), from, to));
});

reportsRouter.post("/reports/custom", requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      from: z.string(),
      to: z.string(),
      branches: z.array(branch).default([]),
      types: z.array(txType).default([]),
      natures: z.array(nature).default([]),
      movementTypeIds: z.array(z.string()).default([]),
      groupBy: z.enum(["none", "month", "branch", "movementType", "nature"]),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const report = customReport(await loadDb(), parsed.data);
  const users = await usersById();
  const txById = new Map(report.transactions.map((tx) => [tx.id, tx]));
  res.json({
    ...report,
    ledger: report.ledger.map((line) => {
      const tx = txById.get(line.id);
      const created = authorOf(users, tx?.createdBy);
      const updated = authorOf(users, tx?.updatedBy);
      return {
        ...line,
        createdByName: created?.name ?? "Carga inicial",
        createdAt: tx?.createdAt ?? line.createdAt,
        updatedByName: updated?.name,
        updatedAt: tx?.updatedAt,
        origin: tx?.origin ?? "integration",
      };
    }),
  });
});
