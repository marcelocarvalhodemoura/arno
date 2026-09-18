import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types.js";

const SECRET = process.env.AUTH_SECRET ?? "arno-friedrich-tesouraria-2026";

export interface AuthPayload {
  user: string;
  userId: string;
  role: UserRole;
  exp: number;
}

function sign(payload: AuthPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): AuthPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthPayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}

export function issueToken(user: string, userId: string, role: UserRole): string {
  return sign({
    user,
    userId,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  (req as Request & { auth: AuthPayload }).auth = payload;
  next();
}

export function getAuth(req: Request): AuthPayload {
  return (req as Request & { auth: AuthPayload }).auth;
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!roles.includes(auth.role)) {
      res.status(403).json({ error: "Acesso restrito a este perfil" });
      return;
    }
    next();
  };
}
