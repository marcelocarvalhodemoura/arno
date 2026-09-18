import { Router } from "express";
import { z } from "zod";
import { getAuth } from "../shared/auth/auth.js";
import { loadDb, mutate } from "../shared/persistence/finance-store.js";
import { ALL_BRANCHES, resolveMensalidadeDueDay, YOUTH_BRANCHES } from "../shared/types.js";
import { usersById, withAuthors } from "../shared/http/presenters.js";
import { direction } from "../shared/http/schemas.js";
import { errorMessage } from "../shared/http/errors.js";
import {
  createFee,
  createMovementType,
  deleteFee,
  ensureFees,
  patchSettings,
  updateFee,
  updateMovementType,
} from "./catalog.js";

export const catalogRouter = Router();

catalogRouter.get("/settings", async (_req, res) => {
  const settings = (await loadDb()).settings;
  res.json({
    ...settings,
    mensalidadeDueDay: resolveMensalidadeDueDay(settings.mensalidadeDueDay),
  });
});

catalogRouter.patch("/settings", async (req, res) => {
  const parsed = z
    .object({
      openingBalance: z.number().optional(),
      groupName: z.string().min(2).optional(),
      mensalidadeDueDay: z.number().int().min(1).max(31).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const auth = getAuth(req);
  if (auth.role !== "admin" && (parsed.data.openingBalance !== undefined || parsed.data.groupName !== undefined)) {
    res.status(403).json({ error: "Só a administração altera o nome do grupo e o saldo inicial" });
    return;
  }
  const settings = await mutate((db) => patchSettings(db, parsed.data, auth.userId));
  res.json({
    ...settings,
    mensalidadeDueDay: resolveMensalidadeDueDay(settings.mensalidadeDueDay),
  });
});

catalogRouter.get("/movement-types", async (_req, res) => {
  const users = await usersById();
  res.json((await loadDb()).movementTypes.map((type) => withAuthors(type, users)));
});

catalogRouter.post("/movement-types", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      direction,
      description: z.string().optional().default(""),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const created = await mutate((db) => createMovementType(db, parsed.data, getAuth(req).userId));
    res.status(201).json(created);
  } catch (error) {
    res.status(409).json({ error: errorMessage(error, "Não foi possível criar") });
  }
});

catalogRouter.patch("/movement-types/:id", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      direction: direction.optional(),
      description: z.string().optional(),
      active: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await mutate((db) => updateMovementType(db, req.params.id, parsed.data, getAuth(req).userId));
    if (!updated) {
      res.status(404).json({ error: "Tipo não encontrado" });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(409).json({ error: errorMessage(error, "Não foi possível alterar") });
  }
});

catalogRouter.get("/fees", async (req, res) => {
  await mutate((db) => {
    ensureFees(db, getAuth(req).userId);
  });
  const users = await usersById();
  res.json((await loadDb()).fees.map((fee) => withAuthors(fee, users)));
});

catalogRouter.post("/fees", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      amount: z.number().positive(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const created = await mutate((db) => createFee(db, parsed.data, getAuth(req).userId));
    res.status(201).json(created);
  } catch (error) {
    res.status(409).json({ error: errorMessage(error, "Não foi possível criar") });
  }
});

catalogRouter.patch("/fees/:id", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      amount: z.number().positive().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await mutate((db) => updateFee(db, req.params.id, parsed.data, getAuth(req).userId));
    if (!updated) {
      res.status(404).json({ error: "Taxa não encontrada" });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(409).json({ error: errorMessage(error, "Não foi possível alterar") });
  }
});

catalogRouter.delete("/fees/:id", async (req, res) => {
  const removed = await mutate((db) => deleteFee(db, req.params.id));
  if (!removed) {
    res.status(404).json({ error: "Taxa não encontrada" });
    return;
  }
  res.status(204).end();
});

catalogRouter.get("/meta", async (_req, res) => {
  res.json({
    branches: YOUTH_BRANCHES,
    allBranches: ALL_BRANCHES,
  });
});
