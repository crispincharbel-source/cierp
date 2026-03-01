/**
 * CI ERP Auth Context — uses real backend API for authentication.
 * POST /api/v1/auth/login  → { access_token, user }
 * GET  /api/v1/auth/me     → { user }
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, saveAuth, clearAuth } from "./api";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  company_id: string;
  company_code: string;
  roles: string[];
  is_superadmin: boolean;
};

type StoredAuth = { token: string; tenant_id?: string };

type AuthContextValue = {
  token: string | null;
  tenantId: string | null;
  user: AuthUser | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const LS_KEY = "ci_erp_auth";

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    return { token: String(parsed.token), tenant_id: parsed?.tenant_id ?? undefined };
  } catch { return null; }
}

function writeStored(data: StoredAuth | null) {
  if (!data) localStorage.removeItem(LS_KEY);
  else localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken]     = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Fetch user profile from real backend
  const fetchMe = async (tok: string): Promise<AuthUser> => {
    const data = await apiFetch<{ user: AuthUser }>("/auth/me", { token: tok });
    return data.user;
  };

  // Rehydrate session on mount
  useEffect(() => {
    const stored = readStored();
    if (!stored) { setIsReady(true); return; }

    setToken(stored.token);
    setTenantId(stored.tenant_id ?? null);

    (async () => {
      try {
        const me = await fetchMe(stored.token);
        setUser(me);
        setTenantId(me.company_id);
      } catch {
        // Token expired or invalid — clear session
        writeStored(null);
        setToken(null);
        setTenantId(null);
        setUser(null);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const resp = await apiFetch<{ access_token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const tok      = resp.access_token;
    const me       = resp.user;
    const tenantId = me.company_id || "cierp";

    writeStored({ token: tok, tenant_id: tenantId });
    saveAuth({ token: tok, tenant_id: tenantId });

    setToken(tok);
    setTenantId(tenantId);
    setUser(me);
  };

  const logout = async () => {
    // Best-effort server-side logout
    try {
      if (token) await apiFetch("/auth/logout", { method: "POST", token });
    } catch { /* ignore */ }
    writeStored(null);
    clearAuth();
    setToken(null);
    setTenantId(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, tenantId, user, isReady, login, logout }),
    [token, tenantId, user, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
