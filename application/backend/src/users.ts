import { pool } from "./db.js";
import { hashPassword } from "./password.js";
import { id } from "./id.js";
import type { AppUser, RecordOrigin, UserRole } from "./types.js";

interface UserRow {
  id: string;
  username: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at?: string;
  origin?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

function toIso(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toUser(row: UserRow): AppUser {
  return {
    id: String(row.id),
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    origin: row.origin === "manual" ? "manual" : "integration",
    createdBy: row.created_by ? String(row.created_by) : undefined,
    updatedAt: toIso(row.updated_at),
    updatedBy: row.updated_by ? String(row.updated_by) : undefined,
  };
}

export async function findUserByUsername(username: string): Promise<(AppUser & { passwordHash: string }) | null> {
  const result = await pool.query<UserRow>("SELECT * FROM users WHERE username = $1", [username]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...toUser(row), passwordHash: row.password_hash };
}

export async function listUsers(): Promise<AppUser[]> {
  const result = await pool.query<UserRow>("SELECT * FROM users ORDER BY name");
  return result.rows.map(toUser);
}

export async function createUser(input: {
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdBy?: string;
  origin?: RecordOrigin;
}): Promise<AppUser> {
  const userId = id();
  const passwordHash = await hashPassword(input.password);
  const result = await pool.query<UserRow>(
    `INSERT INTO users (id, username, name, email, password_hash, role, origin, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      input.username,
      input.name,
      input.email,
      passwordHash,
      input.role,
      input.origin ?? "manual",
      input.createdBy ?? null,
    ],
  );
  return toUser(result.rows[0]);
}

export async function updateUser(
  userId: string,
  input: {
    name?: string;
    email?: string;
    role?: UserRole;
    active?: boolean;
    password?: string;
    updatedBy?: string;
  },
): Promise<AppUser | null> {
  const current = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [userId]);
  if (!current.rows[0]) return null;
  const row = current.rows[0];
  const passwordHash = input.password ? await hashPassword(input.password) : row.password_hash;
  const result = await pool.query<UserRow>(
    `UPDATE users
     SET name = $2,
         email = $3,
         role = $4,
         active = $5,
         password_hash = $6,
         updated_at = NOW(),
         updated_by = $7
     WHERE id = $1
     RETURNING *`,
    [
      userId,
      input.name ?? row.name,
      input.email ?? row.email,
      input.role ?? row.role,
      input.active ?? row.active,
      passwordHash,
      input.updatedBy ?? row.updated_by ?? null,
    ],
  );
  return toUser(result.rows[0]);
}

export async function countUsers(): Promise<number> {
  const result = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
  return Number(result.rows[0]?.count ?? 0);
}
