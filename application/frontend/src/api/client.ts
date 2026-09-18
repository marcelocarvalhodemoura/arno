import { appBase } from "../base";

const TOKEN_KEY = "arno-tesouraria-token";
const loginPath = `${appBase}/login`;

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function errorMessage(error: unknown, status: number): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const payload = error as { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> };
    const fields = Object.values(payload.fieldErrors ?? {})
      .flat()
      .filter(Boolean);
    const form = (payload.formErrors ?? []).filter(Boolean);
    const first = [...form, ...fields][0];
    if (first) return first;
  }
  return `Erro ${status}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith(loginPath)) {
      window.location.assign(loginPath);
    }
    throw new ApiError(401, "Não autorizado");
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(data.error, res.status));
  }
  return data as T;
}
