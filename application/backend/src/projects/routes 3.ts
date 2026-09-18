import { Router } from "express";
import { z } from "zod";
import { getAuth, requireRole } from "../shared/auth/auth.js";
import { loadDb, mutate } from "../shared/persistence/finance-store.js";
import type { BranchId } from "../shared/types.js";
import { usersById, withAuthors } from "../shared/http/presenters.js";
import { branch } from "../shared/http/schemas.js";
import { createProject, listProjects, updateProject } from "./projects.js";

export const projectsRouter = Router();

projectsRouter.get("/projects", async (req, res) => {
  const db = await loadDb();
  const users = await usersById();
  const listed = listProjects(db, {
    year: req.query.year ? Number(req.query.year) : undefined,
    branch: req.query.branch as BranchId | undefined,
  });
  res.json(
    listed.map(({ project, actuals, plannedTotal }) => ({
      ...withAuthors(project, users),
      actuals,
      plannedTotal,
    })),
  );
});

projectsRouter.post("/projects", requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      branch,
      year: z.number().int(),
      name: z.string().min(2),
      description: z.string().min(2),
      items: z
        .array(
          z.object({
            category: z.string(),
            description: z.string(),
            planned: z.number().min(0),
            movementTypeId: z.string().optional(),
          }),
        )
        .default([]),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const created = await mutate((db) => createProject(db, parsed.data, getAuth(req).userId));
  res.status(201).json(created);
});

projectsRouter.patch("/projects/:id", requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      description: z.string().min(2).optional(),
      items: z
        .array(
          z.object({
            id: z.string().optional(),
            category: z.string(),
            description: z.string(),
            planned: z.number().min(0),
            movementTypeId: z.string().optional(),
          }),
        )
        .optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await mutate((db) => updateProject(db, req.params.id, parsed.data, getAuth(req).userId));
  if (!updated) {
    res.status(404).json({ error: "Projeto não encontrado" });
    return;
  }
  res.json(updated);
});
