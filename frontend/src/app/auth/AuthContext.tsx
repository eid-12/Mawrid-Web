import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  api,
  ApiError,
  AUTH_EXPIRED_EVENT,
  getAccessToken,
  persistAuthUserSnapshot,
  readAuthUserSnapshot,
  reloadAccessTokenFromStorage,
  REMEMBER_ME_PREF_KEY,
  setAccessToken,
} from "../api/client";

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

/** Home path after login. Strips a possible ROLE_ prefix from the JWT/API. */
export function dashboardPathForRole(role: Role | string | undefined): string {
  const normalized = String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
  if (normalized === "SUPER_ADMIN") return "/superadmin/dashboard";
  if (normalized === "ADMIN") return "/admin/dashboard";
  return "/user/dashboard";
}

export type AuthUser = {
  userId: number;
  tenantId: number | null;
  tenantName?: string | null;
  tenantStatus?: string | null;
  role: Role;
  name: string;
  email: string;
  emailVerified: boolean;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  register: (payload: {
    tenantId?: number | null;
    role: Role;
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<{ message: string }>;
  verifyEmail: (token: string) => Promise<void>;
  verifyRegistration: (email: string, otp: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyOtpAndResetPassword: (email: string, otp: string) => Promise<void>;
  hydrate: (options?: { silent?: boolean }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUserStatus: () => Promise<void>;
};

const Ctx = createContext<AuthState | undefined>(undefined);

function loadStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readAuthUserSnapshot();
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function persistUser(user: AuthUser | null) {
  persistAuthUserSnapshot(user ? JSON.stringify(user) : null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    getAccessToken() ? loadStoredUser() : null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    setError(null);
  }

  async function login(email: string, password: string, rememberMe = false) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{
        accessToken: string;
        userId: number;
        tenantId: number | null;
        tenantName?: string | null;
        tenantStatus?: string | null;
        role: Role;
        name: string;
        email: string;
        emailVerified: boolean;
      }>("/api/auth/login", { email, password, rememberMe });
      setAccessToken(data.accessToken, rememberMe);
      const tokenSaved = Boolean(getAccessToken());
      if (!tokenSaved) {
        throw new Error("Authentication token was not stored correctly.");
      }
      const loggedInUser: AuthUser = {
        userId: data.userId,
        tenantId: data.tenantId,
        tenantName: data.tenantName ?? undefined,
        tenantStatus: data.tenantStatus ?? undefined,
        role: data.role,
        name: data.name,
        email: data.email,
        emailVerified: data.emailVerified,
      };
      setUser(loggedInUser);
      persistUser(loggedInUser);
      return loggedInUser;
    } catch (e) {
      const err = e as ApiError;
      setError(err.message ?? "Login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function hydrate(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }
    // No access token: skip /me so a restored Back page cannot revive a session.
    if (!getAccessToken()) {
      setUser(null);
      persistUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<{
        userId: number;
        tenantId: number | null;
        tenantName?: string | null;
        tenantStatus?: string | null;
        role: Role;
        name: string;
        email: string;
        emailVerified: boolean;
      }>("/api/auth/me");
      setUser(me);
      persistUser(me);
    } catch (e) {
      const err = e as ApiError;
      // Only drop the session when the token is actually rejected, not on a network blip.
      if (err?.status === 401 || err?.code === "COLLEGE_REMOVED") {
        setUser(null);
        setAccessToken(null);
        persistUser(null);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    try {
      const me = await api.get<{
        userId: number;
        tenantId: number | null;
        tenantName?: string | null;
        tenantStatus?: string | null;
        role: Role;
        name: string;
        email: string;
        emailVerified: boolean;
      }>("/api/auth/me");
      setUser(me);
      persistUser(me);
    } catch {
      // Ignore - profile fetch failed (e.g. logged out)
    }
  }

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/logout", {});
    } finally {
      setAccessToken(null);
      setUser(null);
      persistUser(null);
      setLoading(false);
    }
  }

  /** Public signup. Backend ignores a client-supplied ADMIN/SUPER_ADMIN role. */
  async function register(payload: {
    tenantId?: number | null;
    role: Role;
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) {
    const data = await api.post<{ message: string }>("/api/auth/register", payload);
    return data;
  }

  async function verifyEmail(token: string) {
    await api.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  async function verifyRegistration(email: string, otp: string) {
    await api.post("/api/auth/verify-registration", { email, otp });
  }

  async function resendVerification(email: string) {
    const data = await api.post<{ message: string }>("/api/auth/resend-verification", { email });
    return data;
  }

  async function forgotPassword(email: string) {
    const data = await api.post<{ message: string }>("/api/auth/forgot-password", { email });
    return data;
  }

  async function resetPassword(token: string, newPassword: string) {
    await api.post("/api/auth/reset-password", { token, newPassword });
  }

  async function verifyOtpAndResetPassword(email: string, otp: string) {
    await api.post("/api/auth/verify-reset-otp", { email, otp });
  }

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      clearError,
      login,
      logout,
      register,
      verifyEmail,
      verifyRegistration,
      resendVerification,
      forgotPassword,
      resetPassword,
      verifyOtpAndResetPassword,
      hydrate,
      refreshProfile,
      refreshUserStatus: refreshProfile,
    }),
    [user, loading, error]
  );

  useEffect(() => {
    void hydrate();
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      persistUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      reloadAccessTokenFromStorage();
      if (!getAccessToken()) {
        setUser(null);
        persistUser(null);
      }
    };
    // Back/forward, restored tabs, and logout in another tab must drop a stale in-memory session.
    const onPageShow = (event: PageTransitionEvent) => {
      syncFromStorage();
      if (event.persisted && getAccessToken()) {
        void hydrate({ silent: true });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncFromStorage();
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === ACCESS_TOKEN_STORAGE_KEY ||
        event.key === AUTH_USER_STORAGE_KEY ||
        event.key === REMEMBER_ME_PREF_KEY ||
        event.key === null
      ) {
        syncFromStorage();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", syncFromStorage);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", syncFromStorage);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

