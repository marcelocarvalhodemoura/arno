import { Router } from "express";
import { z } from "zod";
import { getAuth, issueToken, requireAuth, requireRole } from "./auth.js";
import { verifyPassword } from "./password.js";
import { createUser, findUserByUsername, listUsers, updateUser } from "./users.js";
import { cashFlow, customReport, dashboard, projectActuals } from "./finance.js";
import { loadDb, mutate, resetDb } from "./store.js";
import { createdAudit, updatedAudit } from "./audit.js";
import { id } from "./id.js";
import { interpretStatement, isMensalidadeName, isUnidentifiedName } from "./statement.js";
import { aiConfigured, enrichWithAi } from "./statement-ai.js";
import { remapImportCsv } from "./import-map.js";
import { pdfToStatementCsv } from "./statement-pdf.js";
import { fold } from "./csv.js";
import type { AppUser, BranchId, DatabaseShape, MemberGuardian, RecordOrigin, UserRole, YouthBranchId } from "./types.js";
import { ALL_BRANCHES, roundMoney, YOUTH_BRANCHES } from "./types.js";

const youthBranch = z.enum([
  "filhote",
  "lobinho",
  "escoteiro",
  "senior",
  "pioneiro",
  "flor-de-lis",
]);
const branch = z.enum([
  "filhote",
  "lobinho",
  "escoteiro",
  "senior",
  "pioneiro",
  "flor-de-lis",
  "grupo",
]);
const method = z.enum(["pix", "cash", "transfer", "card", "other"]);
const paymentStatus = z.enum(["paid", "pending"]);
const nature = z.enum(["fixed", "variable"]);
const txType = z.enum(["income", "expense"]);
const holderKind = z.enum(["parent", "youth", "other"]);
const direction = z.enum(["income", "expense", "both"]);
const userRole = z.enum(["admin", "tesoureiro"]);

function authorOf(users: Map<string, AppUser>, userId?: string) {
  if (!userId) return null;
  const user = users.get(userId);
  return {
    id: userId,
    name: user?.name ?? "Usuário removido",
    username: user?.username ?? "",
  };
}

function withAuthors<T extends { createdBy?: string; updatedBy?: string }>(
  record: T,
  users: Map<string, AppUser>,
) {
  return {
    ...record,
    createdByUser: authorOf(users, record.createdBy),
    updatedByUser: authorOf(users, record.updatedBy),
  };
}

const guardianInput = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(2),
  relationship: z.string().min(2),
  phone: z.string().optional().default(""),
  email: z
    .string()
    .optional()
    .default("")
    .refine((value) => !value || z.string().email().safeParse(value).success, "E-mail do responsável inválido"),
});

function isMensalidadeMovement(db: DatabaseShape, movementTypeId: string) {
  const movement = db.movementTypes.find((item) => item.id === movementTypeId);
  return Boolean(movement && isMensalidadeName(movement.name));
}

function cleanedGuardians(list: z.infer<typeof guardianInput>[]) {
  return list
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      relationship: item.relationship.trim(),
      phone: (item.phone ?? "").trim(),
      email: (item.email ?? "").trim(),
    }))
    .filter((item) => item.name.length >= 2);
}

function assertYouthGuardians(role: string, count: number) {
  if (role === "jovem" && count < 1) {
    throw new Error("Informe pelo menos um responsável do jovem");
  }
}

function replaceGuardians(
  db: DatabaseShape,
  memberId: string,
  list: ReturnType<typeof cleanedGuardians>,
  userId: string,
  origin: RecordOrigin = "manual",
) {
  const existing = (db.memberGuardians ?? []).filter((item) => item.memberId === memberId);
  const others = (db.memberGuardians ?? []).filter((item) => item.memberId !== memberId);
  const kept: MemberGuardian[] = [];
  const usedIds = new Set<string>();
  for (const item of list) {
    const current = item.id ? existing.find((guardian) => guardian.id === item.id) : undefined;
    if (current) {
      kept.push({
        ...current,
        name: item.name,
        relationship: item.relationship,
        phone: item.phone,
        email: item.email,
        ...updatedAudit(userId),
      });
      usedIds.add(current.id);
      continue;
    }
    kept.push({
      id: id(),
      memberId,
      name: item.name,
      relationship: item.relationship,
      phone: item.phone,
      email: item.email,
      ...createdAudit(userId, origin),
    });
  }
  const removed = new Set(existing.filter((item) => !usedIds.has(item.id)).map((item) => item.id));
  for (const tx of db.transactions) {
    if (tx.memberGuardianId && removed.has(tx.memberGuardianId)) {
      delete tx.memberGuardianId;
    }
  }
  db.memberGuardians = [...others, ...kept];
}

function resolveGuardianId(
  db: DatabaseShape,
  memberId: string | undefined,
  guardianId: string | undefined,
) {
  if (!guardianId) return undefined;
  if (!memberId) throw new Error("Informe o associado do responsável");
  const guardian = (db.memberGuardians ?? []).find(
    (item) => item.id === guardianId && item.memberId === memberId,
  );
  if (!guardian) throw new Error("Responsável não pertence a este associado");
  return guardian.id;
}

async function usersById() {
  return new Map((await listUsers()).map((user) => [user.id, user]));
}

export const router = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = z
    .object({ user: z.string().min(1), password: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe usuário e senha" });
    return;
  }
  const { user, password } = parsed.data;
  const found = await findUserByUsername(user);
  if (!found || !found.active || !(await verifyPassword(password, found.passwordHash))) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }
  res.json({
    token: issueToken(found.username, found.id, found.role),
    user: found.username,
    role: found.role,
    name: found.name,
    group: "Grupo Escoteiro Arno Friedrich",
  });
});

router.use(requireAuth);

router.get("/auth/me", async (req, res) => {
  const auth = getAuth(req);
  res.json({ user: auth.user, role: auth.role, userId: auth.userId });
});

router.get("/users", requireRole("admin"), async (_req, res) => {
  const users = await usersById();
  res.json((await listUsers()).map((user) => withAuthors(user, users)));
});

router.post("/users", requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      username: z.string().min(2),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: userRole,
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const created = await createUser({
      ...parsed.data,
      role: parsed.data.role as UserRole,
      createdBy: getAuth(req).userId,
      origin: "manual",
    });
    res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar usuário";
    if (message.includes("users_username") || message.includes("users_email")) {
      res.status(409).json({ error: "Usuário ou e-mail já existe" });
      return;
    }
    res.status(400).json({ error: message });
  }
});

router.patch("/users/:id", requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      role: userRole.optional(),
      active: z.boolean().optional(),
      password: z.string().min(6).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await updateUser(req.params.id, {
    ...parsed.data,
    updatedBy: getAuth(req).userId,
  });
  if (!updated) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(updated);
});

router.post("/admin/reset", requireRole("admin"), async (_req, res) => {
  res.json(await resetDb());
});

router.get("/dashboard", requireRole("admin"), async (req, res) => {
  const year = Number(req.query.year ?? new Date().getFullYear());
  const month = Number(req.query.month ?? new Date().getMonth() + 1);
  res.json(dashboard(await loadDb(), year, month));
});

router.get("/settings", requireRole("admin"), async (_req, res) => {
  res.json((await loadDb()).settings);
});

router.patch("/settings", requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      openingBalance: z.number().optional(),
      groupName: z.string().min(2).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const settings = await mutate((db) => {
    Object.assign(db.settings, parsed.data);
    return db.settings;
  });
  res.json(settings);
});

router.get("/members", async (req, res) => {
  const db = await loadDb();
  const users = await usersById();
  const branchFilter = req.query.branch as string | undefined;
  const status = req.query.status as string | undefined;
  let list = db.members;
  if (branchFilter) list = list.filter((m) => m.branch === branchFilter);
  if (status) list = list.filter((m) => m.status === status);
  res.json(
    list.map((member) => ({
      ...withAuthors(member, users),
      accounts: db.memberAccounts
        .filter((a) => a.memberId === member.id)
        .map((account) => withAuthors(account, users)),
      guardians: (db.memberGuardians ?? [])
        .filter((guardian) => guardian.memberId === member.id)
        .map((guardian) => withAuthors(guardian, users)),
    })),
  );
});

router.post("/members", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(8),
      branch: youthBranch,
      role: z.enum(["jovem", "escotista", "dirigente", "clube"]),
      monthlyFee: z.number().min(0),
      joinedAt: z.string(),
      clubeLtc: z.boolean(),
      guardians: z.array(guardianInput).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const member = await mutate((db) => {
      if (db.members.some((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase())) {
        throw new Error("E-mail já cadastrado");
      }
      const { guardians, ...data } = parsed.data;
      const list = cleanedGuardians(guardians ?? []);
      assertYouthGuardians(data.role, list.length);
      const created = {
        id: id(),
        status: "active" as const,
        ...data,
        monthlyFee: roundMoney(data.monthlyFee),
        ...createdAudit(getAuth(req).userId),
      };
      db.members.push(created);
      replaceGuardians(db, created.id, list, getAuth(req).userId);
      return created;
    });
    res.status(201).json(member);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível cadastrar";
    res.status(message === "E-mail já cadastrado" ? 409 : 400).json({ error: message });
  }
});

router.patch("/members/:id", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(8).optional(),
      branch: youthBranch.optional(),
      role: z.enum(["jovem", "escotista", "dirigente", "clube"]).optional(),
      monthlyFee: z.number().min(0).optional(),
      status: z.enum(["active", "inactive"]).optional(),
      joinedAt: z.string().optional(),
      clubeLtc: z.boolean().optional(),
      guardians: z.array(guardianInput).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await mutate((db) => {
      const member = db.members.find((m) => m.id === req.params.id);
      if (!member) return null;
      if (
        parsed.data.email &&
        db.members.some(
          (item) =>
            item.id !== member.id && item.email.toLowerCase() === parsed.data.email!.toLowerCase(),
        )
      ) {
        throw new Error("E-mail já cadastrado");
      }
      const { guardians, ...data } = parsed.data;
      const nextRole = data.role ?? member.role;
      if (nextRole !== "jovem") {
        replaceGuardians(db, member.id, [], getAuth(req).userId);
      } else if (guardians) {
        const list = cleanedGuardians(guardians);
        assertYouthGuardians(nextRole, list.length);
        replaceGuardians(db, member.id, list, getAuth(req).userId);
      } else if (data.role === "jovem" && member.role !== "jovem") {
        const count = (db.memberGuardians ?? []).filter((item) => item.memberId === member.id).length;
        assertYouthGuardians(nextRole, count);
      }
      Object.assign(member, data);
      if (parsed.data.monthlyFee !== undefined) {
        member.monthlyFee = roundMoney(parsed.data.monthlyFee);
      }
      Object.assign(member, updatedAudit(getAuth(req).userId));
      return member;
    });
    if (!updated) {
      res.status(404).json({ error: "Associado não encontrado" });
      return;
    }
    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível alterar";
    res.status(message === "E-mail já cadastrado" ? 409 : 400).json({ error: message });
  }
});

const accountBody = z.object({
  holderName: z.string().min(2),
  holderKind,
  relationship: z.string().min(1),
  pixKey: z.string().optional().default(""),
  bank: z.string().optional().default(""),
  agency: z.string().optional().default(""),
  accountNumber: z.string().optional().default(""),
  document: z.string().optional().default(""),
  notes: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
});

router.post("/members/:id/accounts", async (req, res) => {
  const parsed = accountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const created = await mutate((db) => {
    const member = db.members.find((m) => m.id === req.params.id);
    if (!member) return null;
    if (parsed.data.isPrimary) {
      for (const account of db.memberAccounts) {
        if (account.memberId === member.id) account.isPrimary = false;
      }
    }
    const account = {
      id: id(),
      memberId: member.id,
      active: true,
      ...parsed.data,
      ...createdAudit(getAuth(req).userId),
    };
    db.memberAccounts.push(account);
    return account;
  });
  if (!created) {
    res.status(404).json({ error: "Associado não encontrado" });
    return;
  }
  res.status(201).json(created);
});

router.patch("/member-accounts/:id", async (req, res) => {
  const parsed = accountBody.partial().extend({ active: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await mutate((db) => {
    const account = db.memberAccounts.find((a) => a.id === req.params.id);
    if (!account) return null;
    Object.assign(account, parsed.data, updatedAudit(getAuth(req).userId));
    if (parsed.data.isPrimary) {
      for (const other of db.memberAccounts) {
        if (other.memberId === account.memberId && other.id !== account.id) {
          other.isPrimary = false;
        }
      }
    }
    return account;
  });
  if (!updated) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  res.json(updated);
});

router.delete("/member-accounts/:id", async (req, res) => {
  const ok = await mutate((db) => {
    const before = db.memberAccounts.length;
    db.memberAccounts = db.memberAccounts.filter((a) => a.id !== req.params.id);
    return db.memberAccounts.length < before;
  });
  if (!ok) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  res.status(204).end();
});

router.get("/movement-types", async (_req, res) => {
  const users = await usersById();
  res.json((await loadDb()).movementTypes.map((type) => withAuthors(type, users)));
});

router.post("/movement-types", async (req, res) => {
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
    const created = await mutate((db) => {
      if (db.movementTypes.some((t) => t.name.toLowerCase() === parsed.data.name.toLowerCase())) {
        throw new Error("Tipo já cadastrado");
      }
      const type = { id: id(), active: true, ...parsed.data, ...createdAudit(getAuth(req).userId) };
      db.movementTypes.push(type);
      return type;
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Não foi possível criar" });
  }
});

router.patch("/movement-types/:id", async (req, res) => {
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
  const updated = await mutate((db) => {
    const type = db.movementTypes.find((t) => t.id === req.params.id);
    if (!type) return null;
    Object.assign(type, parsed.data, updatedAudit(getAuth(req).userId));
    return type;
  });
  if (!updated) {
    res.status(404).json({ error: "Tipo não encontrado" });
    return;
  }
  res.json(updated);
});

router.get("/fees", async (_req, res) => {
  const users = await usersById();
  res.json((await loadDb()).fees.map((fee) => withAuthors(fee, users)));
});

router.post("/fees", async (req, res) => {
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
    const created = await mutate((db) => {
      if (db.fees.some((fee) => fee.name.toLowerCase() === parsed.data.name.toLowerCase())) {
        throw new Error("Taxa já cadastrada");
      }
      const fee = {
        id: id(),
        name: parsed.data.name,
        amount: roundMoney(parsed.data.amount),
        ...createdAudit(getAuth(req).userId),
      };
      db.fees.push(fee);
      return fee;
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Não foi possível criar" });
  }
});

router.patch("/fees/:id", async (req, res) => {
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
    const updated = await mutate((db) => {
      const fee = db.fees.find((item) => item.id === req.params.id);
      if (!fee) return null;
      if (
        parsed.data.name &&
        db.fees.some((item) => item.id !== fee.id && item.name.toLowerCase() === parsed.data.name!.toLowerCase())
      ) {
        throw new Error("Taxa já cadastrada");
      }
      if (parsed.data.name !== undefined) fee.name = parsed.data.name;
      if (parsed.data.amount !== undefined) fee.amount = roundMoney(parsed.data.amount);
      Object.assign(fee, updatedAudit(getAuth(req).userId));
      return fee;
    });
    if (!updated) {
      res.status(404).json({ error: "Taxa não encontrada" });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Não foi possível alterar" });
  }
});

router.delete("/fees/:id", async (req, res) => {
  const removed = await mutate((db) => {
    const index = db.fees.findIndex((fee) => fee.id === req.params.id);
    if (index < 0) return false;
    db.fees.splice(index, 1);
    return true;
  });
  if (!removed) {
    res.status(404).json({ error: "Taxa não encontrada" });
    return;
  }
  res.status(204).end();
});

router.get("/transactions", async (req, res) => {
  const db = await loadDb();
  const users = await usersById();
  const from = (req.query.from as string) ?? "2000-01-01";
  const to = (req.query.to as string) ?? "2100-12-31";
  const branchFilter = req.query.branch as BranchId | undefined;
  const type = req.query.type as "income" | "expense" | undefined;
  const natureFilter = req.query.nature as "fixed" | "variable" | undefined;
  let list = db.transactions.filter((t) => t.date >= from && t.date <= to);
  if (branchFilter) list = list.filter((t) => t.branch === branchFilter);
  if (type) list = list.filter((t) => t.type === type);
  if (natureFilter) list = list.filter((t) => t.nature === natureFilter);
  list = [...list].sort((a, b) => b.date.localeCompare(a.date));
  res.json(
    list.map((t) => ({
      ...withAuthors(t, users),
      movementType: db.movementTypes.find((mt) => mt.id === t.movementTypeId) ?? null,
      member: t.memberId ? db.members.find((m) => m.id === t.memberId) ?? null : null,
      account: t.memberAccountId
        ? db.memberAccounts.find((a) => a.id === t.memberAccountId) ?? null
        : null,
      guardian: t.memberGuardianId
        ? (db.memberGuardians ?? []).find((item) => item.id === t.memberGuardianId) ?? null
        : null,
    })),
  );
});

router.post("/transactions", async (req, res) => {
  const parsed = z
    .object({
      date: z.string(),
      type: txType,
      nature,
      movementTypeId: z.string().min(1),
      description: z.string().min(2),
      amount: z.number().positive(),
      branch,
      method,
      paymentStatus: paymentStatus.optional(),
      memberId: z.string().optional(),
      memberAccountId: z.string().optional(),
      memberGuardianId: z.string().optional(),
      projectId: z.string().optional(),
      notes: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const auth = getAuth(req);
  try {
    const created = await mutate((db) => {
      const movement = db.movementTypes.find((t) => t.id === parsed.data.movementTypeId);
      if (!movement || !movement.active) throw new Error("Tipo de movimentação inválido");
      if (movement.direction !== "both" && movement.direction !== parsed.data.type) {
        throw new Error("Este tipo não aceita essa direção (entrada/saída)");
      }
      const memberGuardianId = resolveGuardianId(db, parsed.data.memberId, parsed.data.memberGuardianId);
      const tx = {
        id: id(),
        ...parsed.data,
        memberGuardianId,
        paymentStatus: parsed.data.paymentStatus ?? "paid",
        amount: roundMoney(parsed.data.amount),
        ...createdAudit(auth.userId),
      };
      if (!memberGuardianId) delete tx.memberGuardianId;
      db.transactions.push(tx);
      return tx;
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Não foi possível lançar",
    });
  }
});

router.patch("/transactions/:id", async (req, res) => {
  const parsed = z
    .object({
      date: z.string().optional(),
      type: txType.optional(),
      nature: nature.optional(),
      movementTypeId: z.string().optional(),
      description: z.string().min(2).optional(),
      amount: z.number().positive().optional(),
      branch: branch.optional(),
      method: method.optional(),
      paymentStatus: paymentStatus.optional(),
      memberId: z.string().nullable().optional(),
      memberAccountId: z.string().nullable().optional(),
      memberGuardianId: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      notes: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const auth = getAuth(req);
  try {
    const updated = await mutate((db) => {
      const tx = db.transactions.find((t) => t.id === req.params.id);
      if (!tx) return null;
      const { memberId, memberAccountId, memberGuardianId, projectId, amount, movementTypeId, type, ...rest } = parsed.data;
      const nextType = type ?? tx.type;
      const nextMovementId = movementTypeId ?? tx.movementTypeId;
      const movement = db.movementTypes.find((item) => item.id === nextMovementId);
      if (!movement) throw new Error("Tipo de movimentação inválido");
      const sameKind = nextType === tx.type && nextMovementId === tx.movementTypeId;
      if (!sameKind) {
        if (!movement.active) throw new Error("Este tipo está inativo. Escolha outro tipo de movimentação.");
        if (movement.direction !== "both" && movement.direction !== nextType) {
          throw new Error("Este tipo não aceita essa direção (entrada/saída). Troque o tipo ou a direção.");
        }
      }
      Object.assign(tx, rest, { type: nextType, movementTypeId: nextMovementId }, updatedAudit(auth.userId));
      if (amount !== undefined) tx.amount = roundMoney(amount);
      if (memberId === null) delete tx.memberId;
      else if (memberId) tx.memberId = memberId;
      if (memberAccountId === null) delete tx.memberAccountId;
      else if (memberAccountId) tx.memberAccountId = memberAccountId;
      if (projectId === null) delete tx.projectId;
      else if (projectId) tx.projectId = projectId;
      const nextMemberId = memberId === null ? undefined : (memberId ?? tx.memberId);
      if (memberGuardianId === null || !nextMemberId) {
        delete tx.memberGuardianId;
      } else if (memberGuardianId) {
        tx.memberGuardianId = resolveGuardianId(db, nextMemberId, memberGuardianId);
      } else if (tx.memberGuardianId) {
        const belongs = (db.memberGuardians ?? []).some(
          (item) => item.id === tx.memberGuardianId && item.memberId === nextMemberId,
        );
        if (!belongs) delete tx.memberGuardianId;
      }
      return tx;
    });
    if (!updated) {
      res.status(404).json({ error: "Lançamento não encontrado" });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Não foi possível alterar",
    });
  }
});

router.delete("/transactions/:id", async (req, res) => {
  const ok = await mutate((db) => {
    const before = db.transactions.length;
    db.transactions = db.transactions.filter((t) => t.id !== req.params.id);
    return db.transactions.length < before;
  });
  if (!ok) {
    res.status(404).json({ error: "Lançamento não encontrado" });
    return;
  }
  res.status(204).end();
});

const memberImportRow = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  branch: youthBranch,
  role: z.enum(["jovem", "escotista", "dirigente", "clube"]),
  monthlyFee: z.number().min(0),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clubeLtc: z.boolean(),
  guardians: z.array(guardianInput).optional(),
});

const txImportRow = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: txType,
  nature,
  movementTypeId: z.string().min(1),
  description: z.string().min(2),
  amount: z.number().positive(),
  branch,
  method,
  paymentStatus: paymentStatus.optional(),
  memberId: z.string().optional(),
  memberGuardianId: z.string().optional(),
});

router.post("/integrations/members", async (req, res) => {
  const parsed = z.object({ rows: z.array(memberImportRow).min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getAuth(req).userId;
  const result = await mutate((db) => {
    const created: string[] = [];
    const skipped: { email: string; reason: string }[] = [];
    for (const row of parsed.data.rows) {
      if (db.members.some((member) => member.email.toLowerCase() === row.email.toLowerCase())) {
        skipped.push({ email: row.email, reason: "E-mail já cadastrado" });
        continue;
      }
      const { guardians, ...data } = row;
      const member = {
        id: id(),
        status: "active" as const,
        ...data,
        monthlyFee: roundMoney(data.monthlyFee),
        ...createdAudit(userId, "integration"),
      };
      db.members.push(member);
      const list = cleanedGuardians(guardians ?? []);
      if (list.length) replaceGuardians(db, member.id, list, userId, "integration");
      created.push(member.id);
    }
    return { created: created.length, skipped };
  });
  res.json(result);
});

router.post("/integrations/interpret-statement", async (req, res) => {
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
  let csv = parsed.data.csv ?? "";
  if (parsed.data.pdf) {
    try {
      csv = await pdfToStatementCsv(parsed.data.pdf);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Não foi possível ler o PDF do extrato",
      });
      return;
    }
  }
  const userId = getAuth(req).userId;
  const current = await loadDb();
  if (!current.movementTypes.some((item) => item.active && fold(item.name) === "a identificar")) {
    await mutate((db) => {
      db.movementTypes.push({
        id: id(),
        name: "A identificar",
        direction: "both",
        description: "Lançamento importado do extrato, ainda sem tipo definido",
        active: true,
        ...createdAudit(userId, "integration"),
      });
    });
  }
  const db = await loadDb();
  const catalog = {
    movementTypes: db.movementTypes,
    members: db.members.map((member) => ({
      id: member.id,
      name: member.name,
      branch: member.branch,
      monthlyFee: member.monthlyFee,
      status: member.status,
      accounts: db.memberAccounts
        .filter((account) => account.memberId === member.id && account.active)
        .map((account) => ({
          holderName: account.holderName,
          pixKey: account.pixKey,
          document: account.document,
        })),
      guardians: (db.memberGuardians ?? [])
        .filter((guardian) => guardian.memberId === member.id)
        .map((guardian) => ({ id: guardian.id, name: guardian.name })),
    })),
    fees: db.fees,
    pendingPayments: db.transactions
      .filter((tx) => tx.paymentStatus === "pending" && tx.type === "income")
      .map((tx) => ({
        id: tx.id,
        memberId: tx.memberId,
        amount: tx.amount,
        date: tx.date,
        movementTypeId: tx.movementTypeId,
      })),
  };
  const remapped = await remapImportCsv(csv, "statement");
  const interpreted = interpretStatement(remapped.csv, catalog);
  if (interpreted.rows.length > 500) {
    res.status(400).json({ error: "Importe no máximo 500 linhas por vez" });
    return;
  }
  const enriched = await enrichWithAi(interpreted.rows, catalog);
  res.json({
    layout: interpreted.layout,
    aiUsed: enriched.used || remapped.usedAi,
    aiAvailable: aiConfigured(),
    aiMapped: remapped.usedAi,
    mapping: remapped.mapping,
    sample: remapped.sample,
    review: remapped.review,
    rows: enriched.rows,
  });
});

router.post("/integrations/map-import", async (req, res) => {
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

router.post("/integrations/transactions", async (req, res) => {
  const parsed = z.object({ rows: z.array(txImportRow).min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = getAuth(req).userId;
  try {
    const result = await mutate((db) => {
      const created: string[] = [];
      const paid: string[] = [];
      const unidentified: string[] = [];
      const skipped: { description: string; reason: string }[] = [];
      for (const row of parsed.data.rows) {
        const movement = db.movementTypes.find((item) => item.id === row.movementTypeId);
        if (!movement || !movement.active) throw new Error("Tipo de movimentação inválido");
        if (movement.direction !== "both" && movement.direction !== row.type) {
          throw new Error(`O tipo ${movement.name} não aceita essa direção`);
        }
        const memberGuardianId = resolveGuardianId(db, row.memberId, row.memberGuardianId);
        const amount = roundMoney(row.amount);
        if (
          db.transactions.some(
            (tx) =>
              tx.date === row.date &&
              tx.description.toLowerCase() === row.description.toLowerCase() &&
              tx.amount === amount,
          )
        ) {
          skipped.push({ description: row.description, reason: "Lançamento já importado" });
          continue;
        }
        if (row.type === "income" && row.memberId && isMensalidadeName(movement.name)) {
          const month = row.date.slice(0, 7);
          const pending = db.transactions
            .filter(
              (tx) =>
                tx.paymentStatus === "pending" &&
                tx.type === "income" &&
                tx.memberId === row.memberId &&
                tx.amount === amount &&
                isMensalidadeMovement(db, tx.movementTypeId),
            )
            .sort((a, b) => {
              const aSame = a.date.startsWith(month) ? 0 : 1;
              const bSame = b.date.startsWith(month) ? 0 : 1;
              if (aSame !== bSame) return aSame - bSame;
              return a.date.localeCompare(b.date);
            })[0];
          if (pending) {
            pending.paymentStatus = "paid";
            pending.method = row.method ?? pending.method;
            if (memberGuardianId && !pending.memberGuardianId) pending.memberGuardianId = memberGuardianId;
            Object.assign(pending, updatedAudit(userId));
            paid.push(pending.id);
            continue;
          }
          if (
            db.transactions.some(
              (tx) =>
                tx.paymentStatus === "paid" &&
                tx.type === "income" &&
                tx.memberId === row.memberId &&
                tx.amount === amount &&
                isMensalidadeMovement(db, tx.movementTypeId) &&
                (tx.date === row.date || tx.date.startsWith(month)),
            )
          ) {
            skipped.push({ description: row.description, reason: "Mensalidade já está paga neste período" });
            continue;
          }
        }
        const tx = {
          id: id(),
          ...row,
          memberGuardianId,
          amount,
          paymentStatus: row.paymentStatus ?? "paid",
          ...createdAudit(userId, "integration"),
        };
        if (!memberGuardianId) delete tx.memberGuardianId;
        db.transactions.push(tx);
        created.push(tx.id);
        if (isUnidentifiedName(movement.name)) unidentified.push(tx.id);
      }
      return { created: created.length, paid: paid.length, unidentified: unidentified.length, skipped };
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Não foi possível importar o extrato",
    });
  }
});

router.get("/projects", async (req, res) => {
  const db = await loadDb();
  const users = await usersById();
  const year = req.query.year ? Number(req.query.year) : undefined;
  const branchFilter = req.query.branch as YouthBranchId | undefined;
  let list = db.projects;
  if (year) list = list.filter((p) => p.year === year);
  if (branchFilter) list = list.filter((p) => p.branch === branchFilter);
  res.json(
    list.map((p) => ({
      ...withAuthors(p, users),
      actuals: projectActuals(db, p.id),
      plannedTotal: roundMoney(p.items.reduce((s, i) => s + i.planned, 0)),
    })),
  );
});

router.post("/projects", requireRole("admin"), async (req, res) => {
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
          }),
        )
        .default([]),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const created = await mutate((db) => {
    const project = {
      id: id(),
      ...parsed.data,
      items: parsed.data.items.map((item) => ({ ...item, id: id() })),
      ...createdAudit(getAuth(req).userId),
    };
    db.projects.push(project);
    return project;
  });
  res.status(201).json(created);
});

router.patch("/projects/:id", requireRole("admin"), async (req, res) => {
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
          }),
        )
        .optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await mutate((db) => {
    const project = db.projects.find((p) => p.id === req.params.id);
    if (!project) return null;
    if (parsed.data.name) project.name = parsed.data.name;
    if (parsed.data.description) project.description = parsed.data.description;
    if (parsed.data.items) {
      project.items = parsed.data.items.map((item) => ({
        id: item.id ?? id(),
        category: item.category,
        description: item.description,
        planned: roundMoney(item.planned),
      }));
    }
    Object.assign(project, updatedAudit(getAuth(req).userId));
    return project;
  });
  if (!updated) {
    res.status(404).json({ error: "Projeto não encontrado" });
    return;
  }
  res.json(updated);
});

router.get("/reports/cashflow", async (req, res) => {
  const from = (req.query.from as string) ?? `${new Date().getFullYear()}-01-01`;
  const to = (req.query.to as string) ?? new Date().toISOString().slice(0, 10);
  res.json(cashFlow(await loadDb(), from, to));
});

router.post("/reports/custom", requireRole("admin"), async (req, res) => {
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

router.get("/meta", async (_req, res) => {
  res.json({
    branches: YOUTH_BRANCHES,
    allBranches: ALL_BRANCHES,
  });
});
