export type ApiError = {
  status: number;
  message: string;
  /** Backend error code when present (e.g. COLLEGE_INACTIVE) */
  code?: string;
};

let accessToken: string | null = null;
const ACCESS_TOKEN_STORAGE_KEY = "mawrid_access_token";

if (typeof window !== "undefined") {
  accessToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export function getAccessToken() {
  return accessToken;
}

/** Re-read the token after bfcache/back-forward so in-memory state matches storage. */
export function reloadAccessTokenFromStorage() {
  if (typeof window === "undefined") return accessToken;
  accessToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  return accessToken;
}

const viteEnv = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});
const baseUrl = (viteEnv.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";
if (!baseUrl) {
  throw new Error("Missing VITE_API_BASE_URL in frontend environment.");
}

function normalizeApiPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/api";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildApiUrl(path: string): string {
  const normalizedPath = normalizeApiPath(path);
  if (baseUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${baseUrl}${normalizedPath.slice(4)}`;
  }
  if (baseUrl.endsWith("/") && normalizedPath.startsWith("/")) {
    return `${baseUrl.slice(0, -1)}${normalizedPath}`;
  }
  return `${baseUrl}${normalizedPath}`;
}

export const AUTH_EXPIRED_EVENT = "mawrid:auth-expired";
export const SESSION_EXPIRED_NOTICE_KEY = "mawrid_session_expired";
const AUTH_USER_STORAGE_KEY = "mawrid_auth_user";

function clearAuthSession() {
  setAccessToken(null);
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, "1");
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let res: Response;
  try {
    res = await fetch(buildApiUrl(path), {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    const err: ApiError = {
      status: 0,
      message: "Can't reach the server. Check your connection and try again.",
    };
    throw err;
  }

  const skipRefresh = /\/api\/auth\/(login|register|forgot-password|verify-|resend-verification|reset-password)/.test(path);
  // Access JWT expired: rotate via HttpOnly refresh cookie, then retry once.
  // Login/signup/OTP routes skip this so a bad password is not treated as an expired session.
  if (res.status === 401 && retry && !skipRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
    if (!getAccessToken()) {
      const err: ApiError = { status: 401, message: "Your session expired. Please sign in again." };
      throw err;
    }
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = await res.json();
      msg = body?.error ?? body?.message ?? msg;
      if (typeof body?.code === "string" && body.code) {
        code = body.code;
      }
    } catch {
      // ignore
    }
    const err: ApiError = { status: res.status, message: msg, code };
    throw err;
  }

  // 204
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      // 401/403: refresh cookie is gone. 5xx: keep the current access token.
      if (res.status === 401 || res.status === 403) clearAuthSession();
      return false;
    }
    const data = (await res.json()) as { accessToken: string };
    if (!data?.accessToken) return false;
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),
};

