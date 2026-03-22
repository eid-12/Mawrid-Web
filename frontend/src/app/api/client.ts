export type ApiError = {
  status: number;
  message: string;
  /** Backend error code when present (e.g. COLLEGE_INACTIVE) */
  code?: string;
};

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
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

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    // Try refresh once, then retry original request
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
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
    if (!res.ok) return false;
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

