import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "@shared";
import { api, clearToken, getToken, setToken } from "../api/client";

export type SessionUser = {
  user: string;
  name: string;
  role: UserRole;
};

type AuthState = {
  user: string | null;
  name: string | null;
  role: UserRole | null;
  ready: boolean;
  login: (user: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);
const SESSION_KEY = "arno-tesouraria-session";

function readSession(): SessionUser | null {
  if (!getToken()) return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(() => readSession());
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    void api<{ user: string; role: UserRole }>("/auth/me")
      .then((me) => {
        const next = {
          user: me.user,
          role: me.role,
          name: session?.name ?? me.user,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        setSession(next);
      })
      .catch(() => {
        clearToken();
        sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    const res = await api<{ token: string; user: string; role: UserRole; name: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ user: name, password }),
      },
    );
    setToken(res.token);
    const next = { user: res.user, role: res.role, name: res.name };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      name: session?.name ?? null,
      role: session?.role ?? null,
      ready,
      login,
      logout,
    }),
    [session, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do provider");
  return ctx;
}
