const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";
const AUTH_KEY = "ci_erp_auth";

export type ApiError = { status: number; detail: unknown };

type StoredAuth = {
  token?: string;
  tenant_id?: string;
};

function readStoredAuth(): StoredAuth {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredAuth;
    return {
      token: parsed?.token ? String(parsed.token) : undefined,
      tenant_id: parsed?.tenant_id ? String(parsed.tenant_id) : undefined,
    };
  } catch {
    return {};
  }
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string; tenantId?: string } = {}
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  const stored = readStoredAuth();
  const token = opts.token ?? stored.token;
  const tenantId = opts.tenantId ?? stored.tenant_id;

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (tenantId) headers.set("X-Tenant-ID", tenantId);

  const res = await fetch(url, { ...opts, headers, credentials: "include" });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredAuth();
    }
    const detail = (body && (body as { detail: unknown }).detail) ?? body ?? "Request failed";
    throw { status: res.status, detail } as ApiError;
  }

  return body as T;
}

// Grouped export so other files can use "api.fetch()"
export const api = {
  fetch: apiFetch,
};