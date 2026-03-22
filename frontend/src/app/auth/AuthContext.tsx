import React, { createContext, useContext, useMemo, useState } from "react";
import { api, ApiError, getAccessToken, setAccessToken } from "../api/client";

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

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
  login: (email: string, password: string) => Promise<AuthUser>;
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
  hydrate: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUserStatus: () => Promise<void>;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    setError(null);
  }

  async function login(email: string, password: string) {
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
      }>("/api/auth/login", { email, password });
      console.log("Login Response:", data);

      setAccessToken(data.accessToken);
      const tokenSaved = Boolean(getAccessToken());
      console.log("Access token saved:", tokenSaved);
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
      return loggedInUser;
    } catch (e) {
      const err = e as ApiError;
      console.log("Login Error:", err);
      setError(err.message ?? "Login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function hydrate() {
    // If we don't have an access token yet, try refresh silently, then /me
    setLoading(true);
    setError(null);
    try {
      await api.post<{ accessToken: string }>("/api/auth/refresh", {});
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
    } catch {
      setUser(null);
      setAccessToken(null);
      setError(null);
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
    } catch {
      // Ignore - profile fetch failed (e.g. logged out)
    }
  }

  async function refreshUserStatus() {
    await refreshProfile();
  }

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/logout", {});
    } finally {
      setAccessToken(null);
      setUser(null);
      setLoading(false);
    }
  }

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
      refreshUserStatus,
    }),
    [user, loading, error]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

