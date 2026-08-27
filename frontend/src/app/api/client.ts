export type ApiError = {
  status: number;
  message: string;
  /** Backend error code when present (e.g. COLLEGE_INACTIVE) */
  code?: string;
};

let accessToken: string | null = null;
export const ACCESS_TOKEN_STORAGE_KEY = "mawrid_access_token";
export const AUTH_USER_STORAGE_KEY = "mawrid_auth_user";
export const REMEMBER_ME_PREF_KEY = "mawrid_remember_me";

function authStorage(): Storage {
  return isRememberMeEnabled() ? window.localStorage : window.sessionStorage;
}

/** Last login choice: checked Remember me → "1". Used to restore the checkbox. */
export function getRememberMePreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(REMEMBER_ME_PREF_KEY) === "1";
}

/**
 * Where the current session lives.
 * Missing pref + a leftover localStorage token = legacy "always persist" sessions.
 */
export function isRememberMeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const pref = window.localStorage.getItem(REMEMBER_ME_PREF_KEY);
  if (pref === "0") return false;
  if (pref === "1") return true;
  return Boolean(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
}

function readStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  if (isRememberMeEnabled()) {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
      ?? window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  }
  return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function readAuthUserSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  if (isRememberMeEnabled()) {
    return window.localStorage.getItem(AUTH_USER_STORAGE_KEY)
      ?? window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY);
  }
  return window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY);
}

export function persistAuthUserSnapshot(serialized: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
  if (serialized) {
    authStorage().setItem(AUTH_USER_STORAGE_KEY, serialized);
  }
}

if (typeof window !== "undefined") {
  accessToken = readStoredAccessToken();
}

export function setAccessToken(token: string | null, rememberMe?: boolean) {
  accessToken = token;
  if (typeof window === "undefined") return;
  if (typeof rememberMe === "boolean") {
    window.localStorage.setItem(REMEMBER_ME_PREF_KEY, rememberMe ? "1" : "0");
  }
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  if (token) {
    authStorage().setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  }
}

export function getAccessToken() {
  return accessToken;
}

/** Re-read the token after bfcache/back-forward so in-memory state matches storage. */
export function reloadAccessTokenFromStorage() {
  if (typeof window === "undefined") return accessToken;
  accessToken = readStoredAccessToken();
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

function clearAuthSession() {
  setAccessToken(null);
  if (typeof window === "undefined") return;
  persistAuthUserSnapshot(null);
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
      msg = body?.error ?? body?.message ?? body?.detail ?? body?.title ?? msg;
      if (typeof body?.code === "string" && body.code) {
        code = body.code;
      }
    } catch {
      // ignore
    }
    if (
      res.status === 429 ||
      /\b429\b/.test(msg) ||
      /too many requests/i.test(msg) ||
      /too many email requests/i.test(msg)
    ) {
      msg = "A verification code was already sent to your email. Please wait 60 seconds, then try again.";
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

