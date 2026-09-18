import { Router } from "express";
import { z } from "zod";
import { getAuth } from "../shared/auth/auth.js";
import { loadDb, mutate } from "../shared/persistence/finance-store.js";
import { usersById, withAuthors } from "../shared/http/presenters.js";
import { accountBody, createMemberBody, memberImportRow, patchMemberBody } from "../shared/http/schemas.js";
import { errorMessage } from "../shared/http/errors.js";
import {
  addMemberAccount,
  createMember,
  importMembers,
  refreshOfficialFees,
  removeMemberAccount,
  updateMember,
  updateMemberAccount,
} from "./members.js";

export const membersRouter = Router();

membersRouter.get("/members", async (req, res) => {
  const db = await mutate((store) => refreshOfficialFees(store));
  const users = await usersById();
  const branchFilter = req.query.branch as string | undefined;
  const status = req.query.status as string | undefined;
  let list = db.members;
  if (branchFilter) list = list.filter((member) => member.branch === branchFilter);
  if (status) list = list.filter((member) => member.status === status);
  res.json(
    list.map((member) => ({
      ...withAuthors(member, users),
      accounts: db.memberAccounts
        .filter((account) => account.memberId === member.id)
        .map((account) => withAuthors(account, users)),
      guardians: (db.memberGuardians ?? [])
        .filter((guardian) => guardian.memberId === member.id)
        .map((guardian) => withAuthors(guardian, users)),
    })),
  );
});

membersRouter.post("/members", async (req, res) => {
  const parsed = createMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const member = await mutate((db) => createMember(db, parsed.data, getAuth(req).userId));
    res.status(201).json(member);
  } catch (error) {
    const message = errorMessage(error, "Não foi possível cadastrar");
    res.status(message === "E-mail já cadastrado" ? 409 : 400).json({ error: message });
  }
});

membersRouter.patch("/members/:id", async (req, res) => {
  const parsed = patchMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await mutate((db) => updateMember(db, req.params.id, parsed.data, getAuth(req).userId));
    if (!updated) {
      res.status(404).json({ error: "Associado não encontrado" });
      return;
    }
    res.json(updated);
  } catch (error) {
    const message = errorMessage(error, "Não foi possível alterar");
    res.status(message === "E-mail já cadastrado" ? 409 : 400).json({ error: message });
  }
});

membersRouter.post("/members/:id/accounts", async (req, res) => {
  const parsed = accountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const created = await mutate((db) => addMemberAccount(db, req.params.id, parsed.data, getAuth(req).userId));
  if (!created) {
    res.status(404).json({ error: "Associado não encontrado" });
    return;
  }
  res.status(201).json(created);
});

membersRouter.patch("/member-accounts/:id", async (req, res) => {
  const parsed = accountBody.partial().extend({ active: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await mutate((db) => updateMemberAccount(db, req.params.id, parsed.data, getAuth(req).userId));
  if (!updated) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  res.json(updated);
});

membersRouter.delete("/member-accounts/:id", async (req, res) => {
  const ok = await mutate((db) => removeMemberAccount(db, req.params.id));
  if (!ok) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  res.status(204).end();
});

membersRouter.post("/integrations/members", async (req, res) => {
  const parsed = z.object({ rows: z.array(memberImportRow).min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const result = await mutate((db) => importMembers(db, parsed.data.rows, getAuth(req).userId));
  res.json(result);
});
