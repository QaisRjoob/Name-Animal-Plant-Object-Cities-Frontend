import { useAuthStore } from "../store/authStore";

const AUTH_ERROR_PATTERNS = ["AUTH_REQUIRED", "expired", "Invalid or expired", "Unauthorized"];

export function isAuthError(message = "") {
  return AUTH_ERROR_PATTERNS.some((p) => message.includes(p));
}

export function expireSession() {
  useAuthStore.getState().clearSession();
}
