import { Router } from "express";
import { z } from "zod";
import { getAuth, issueToken, requireRole } from "../shared/auth/auth.js";
import { hashPassword, isLegacyHash, verifyPassword } from "../shared/auth/password.js";
import {
  createUser,
  findUserByLogin,
  listUsers,
  replacePasswordHash,
  updateUser,
  verifyUserPassword,
} from "./users.js";
import { loadDb, resetDb } from "../shared/persistence/finance-store.js";
import { usersById, withAuthors } from "../shared/http/presenters.js";
import { userRole } from "../shared/http/schemas.js";
import { errorMessage, isUniqueUserConflict } from "../shared/http/errors.js";
import type { UserRole } from "../shared/types.js";

export const identityPublicRouter = Router();
export const identityRouter = Router();

identityPublicRouter.post("/auth/login", async (req, res) => {
  const parsed = z.object({ user: z.string().trim().min(1), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe usuário e senha" });
    return;
  }
  const { user, password } = parsed.data;
  const found = await findUserByLogin(user);
  if (!found || !found.active || !(await verifyPassword(password, found.passwordHash))) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }
  if (isLegacyHash(found.passwordHash)) {
    await replacePasswordHash(found.id, await hashPassword(password));
  }
  const db = await loadDb();
  res.json({
    token: issueToken(found.username, found.id, found.role),
    user: found.username,
    role: found.role,
    name: found.name,
    group: db.settings.groupName,
  });
});

identityRouter.get("/auth/me", async (req, res) => {
  const auth = getAuth(req);
  res.json({ user: auth.user, role: auth.role, userId: auth.userId });
});

identityRouter.get("/users", requireRole("admin"), async (_req, res) => {
  const users = await usersById();
  res.json((await listUsers()).map((user) => withAuthors(user, users)));
});

identityRouter.post("/users", requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      username: z.string().trim().min(2),
      name: z.string().trim().min(2),
      email: z.string().trim().email(),
      password: z.string().min(6),
      passwordConfirm: z.string().min(6),
      role: userRole,
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: "As senhas não coincidem",
      path: ["passwordConfirm"],
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const { passwordConfirm: _passwordConfirm, ...data } = parsed.data;
    const created = await createUser({
      ...data,
      role: data.role as UserRole,
      createdBy: getAuth(req).userId,
      origin: "manual",
    });
    res.status(201).json(created);
  } catch (error) {
    const message = errorMessage(error, "Erro ao criar usuário");
    if (isUniqueUserConflict(message)) {
      res.status(409).json({ error: "Usuário ou e-mail já existe" });
      return;
    }
    res.status(400).json({ error: message });
  }
});

identityRouter.patch("/users/:id", requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      role: userRole.optional(),
      active: z.boolean().optional(),
      password: z.string().min(6).optional(),
      passwordConfirm: z.string().optional(),
      currentPassword: z.string().min(1),
    })
    .refine((data) => !data.password || data.password === data.passwordConfirm, {
      message: "As senhas não coincidem",
      path: ["passwordConfirm"],
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!(await verifyUserPassword(getAuth(req).userId, parsed.data.currentPassword))) {
    res.status(403).json({ error: "Senha de confirmação inválida" });
    return;
  }
  try {
    const { currentPassword: _currentPassword, passwordConfirm: _passwordConfirm, ...data } = parsed.data;
    const updated = await updateUser(req.params.id, {
      ...data,
      updatedBy: getAuth(req).userId,
    });
    if (!updated) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json(updated);
  } catch (error) {
    const message = errorMessage(error, "Erro ao atualizar usuário");
    if (isUniqueUserConflict(message)) {
      res.status(409).json({ error: "Usuário ou e-mail já existe" });
      return;
    }
    res.status(400).json({ error: message });
  }
});

identityRouter.post("/admin/reset", requireRole("admin"), async (_req, res) => {
  res.json(await resetDb());
});
