import type { ApiError } from "../api/client";

export const SESSION_EXPIRED_MESSAGE = "Your session expired. Please sign in again.";

function isApiError(error: unknown): error is ApiError {
  return Boolean(error) && typeof error === "object" && "message" in error;
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

  return raw;
}
