import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getManagedUsers } from "./store";

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
    return {
      token: String(parsed.token),
      tenant_id: parsed?.tenant_id ? String(parsed.tenant_id) : undefined,
    };
  } catch {
    return null;
  }
}

function writeStored(data: StoredAuth | null) {
  if (!data) localStorage.removeItem(LS_KEY);
  else localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const hydrateMe = async (nextToken: string, preferredTenantId?: string | null) => {
    const users = getManagedUsers();
    const matchedUser = users.find(u => u.email === 'admin@cierp.com');
    if (!matchedUser) throw new Error('User not found');
    const me = { user: { ...matchedUser, company_id: 'cierp', company_code: 'CI', roles: ['admin'], is_superadmin: true } };
    const resolvedTenantId = me.user.company_id;
    writeStored({ token: nextToken, tenant_id: resolvedTenantId });
    setTenantId(resolvedTenantId);
    setUser(me.user);
    return { me, resolvedTenantId };
  };

  // Rehydrate on boot, then call /auth/me before rendering protected pages
  useEffect(() => {
    const stored = readStored();
    if (!stored) {
      setIsReady(true);
      return;
    }
    setToken(stored.token);
    setTenantId(stored.tenant_id || null);

    (async () => {
      try {
        await hydrateMe(stored.token, stored.tenant_id || null);
      } catch (e) {
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
    const users = getManagedUsers();
    const matchedUser = users.find(u => u.email === email);
    if (!matchedUser) throw new Error('Invalid credentials');

    const nextToken = 'mock-token';
    const nextTenant = 'cierp';

    setToken(nextToken);

    if (nextTenant && matchedUser) {
      writeStored({ token: nextToken, tenant_id: nextTenant });
      setTenantId(nextTenant);
      setUser({ ...matchedUser, company_id: 'cierp', company_code: 'CI', roles: ['admin'], is_superadmin: true });
      return;
    }

    await hydrateMe(nextToken, nextTenant || null);
  };

  const logout = async () => {
    writeStored(null);
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
