/**
 * CI ERP API Client — typed fetch wrapper with auth, error handling, PDF download.
 */
const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";
const AUTH_KEY = "ci_erp_auth";

export type ApiError = { status: number; detail: unknown };

type StoredAuth = { token?: string; tenant_id?: string };

function readAuth(): StoredAuth {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredAuth;
  } catch { return {}; }
}

export function saveAuth(data: StoredAuth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export function getToken(): string | undefined {
  return readAuth().token;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string; tenantId?: string } = {}
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const stored = readAuth();
  const token    = opts.token    ?? stored.token;
  const tenantId = opts.tenantId ?? stored.tenant_id;

  if (token)    headers.set("Authorization", `Bearer ${token}`);
  if (tenantId) headers.set("X-Tenant-ID", tenantId);

  const res = await fetch(url, { ...opts, headers, credentials: "include" });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  if (!res.ok) {
    if (res.status === 401) clearAuth();
    const detail = (body as any)?.detail ?? body ?? "Request failed";
    throw { status: res.status, detail } as ApiError;
  }
  return body as T;
}

/** Download a PDF blob from an authenticated endpoint */
export async function downloadPDF(path: string, filename: string): Promise<void> {
  const url   = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const token = readAuth().token;
  const res   = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}

export const api = {
  get:    <T>(path: string, opts: RequestInit = {}) => apiFetch<T>(path, { ...opts, method: "GET" }),
  post:   <T>(path: string, body: unknown, opts: RequestInit = {}) =>
    apiFetch<T>(path, { ...opts, method: "POST", body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown, opts: RequestInit = {}) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown, opts: RequestInit = {}) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string, opts: RequestInit = {}) => apiFetch<T>(path, { ...opts, method: "DELETE" }),
  downloadPDF,
  fetch: apiFetch,
};
