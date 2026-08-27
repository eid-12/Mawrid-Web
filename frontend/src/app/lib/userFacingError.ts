import type { ApiError } from "../api/client";

export const SESSION_EXPIRED_MESSAGE = "Your session expired. Please sign in again.";
export const EMAIL_COOLDOWN_MESSAGE =
  "A verification code was already sent to your email. Please wait 60 seconds, then try again.";

function isApiError(error: unknown): error is ApiError {
  return Boolean(error) && typeof error === "object" && "message" in error;
}

export function looksLikeRateLimit(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  return (
    /\b429\b/.test(raw) ||
    /too many requests/i.test(raw) ||
    /too many email requests/i.test(raw) ||
    /request failed \(429\)/i.test(raw)
  );
}

export function isRateLimitError(error: unknown): boolean {
  const err = isApiError(error) ? error : undefined;
  const raw = String(err?.message ?? (error instanceof Error ? error.message : "")).trim();
  return err?.status === 429 || looksLikeRateLimit(raw);
}

export function userNoticeClass(message: string, wait = false): string {
  if (wait || message === EMAIL_COOLDOWN_MESSAGE || looksLikeRateLimit(message)) {
    return "p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl";
  }
  return "p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl";
}

export function userNoticeTextClass(message: string, wait = false): string {
  if (wait || message === EMAIL_COOLDOWN_MESSAGE || looksLikeRateLimit(message)) {
    return "text-sm text-amber-800 dark:text-amber-200";
  }
  return "text-sm text-red-700 dark:text-red-300";
}

/** Turns API/network failures into a sentence a student can act on. */
export function formatApiError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const err = isApiError(error) ? error : undefined;
  const raw = String(err?.message ?? (error instanceof Error ? error.message : "")).trim();

  if (err?.code === "COLLEGE_INACTIVE") {
    return "This college is currently deactivated. You can view existing data, but new actions are disabled.";
  }
  if (err?.code === "COLLEGE_REMOVED") {
    return "Access denied: your college has been removed from the system. Please contact an administrator.";
  }
  if (isRateLimitError(error) || looksLikeRateLimit(raw)) {
    return EMAIL_COOLDOWN_MESSAGE;
  }

  if (
    err?.status === 0 ||
    !raw ||
    /^failed to fetch$/i.test(raw) ||
    /networkerror/i.test(raw) ||
    /load failed/i.test(raw)
  ) {
    return "Can't reach the server. Check your connection and try again.";
  }

  if (/^request failed \(\d+\)$/i.test(raw)) {
    if (err?.status === 401) return SESSION_EXPIRED_MESSAGE;
    if (err?.status === 403) return "You don't have permission to do that.";
    if (err?.status === 404) return "We could not find that item. It may have been removed.";
    if (err?.status && err.status >= 500) return "The server had a problem. Please try again in a moment.";
    return fallback;
  }

  if (looksLikeRateLimit(raw)) return EMAIL_COOLDOWN_MESSAGE;
  return raw;
}
