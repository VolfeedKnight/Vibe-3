const STORAGE_KEY = "backend-api-base-url";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";

let currentApiBaseUrl = readStoredApiBaseUrl() ?? DEFAULT_API_BASE_URL;

export function getApiBaseUrl() {
  return currentApiBaseUrl;
}

export function setApiBaseUrl(value: string) {
  currentApiBaseUrl = normalizeApiBaseUrl(value) ?? DEFAULT_API_BASE_URL;
  persistApiBaseUrl(currentApiBaseUrl);
}

export function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/$/, "");
}

export function resolveApiUrl(path: string, baseUrl = currentApiBaseUrl) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  return `${normalizedBaseUrl}${path}`;
}

function readStoredApiBaseUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeApiBaseUrl(stored) : null;
  } catch {
    return null;
  }
}

function persistApiBaseUrl(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures and keep the in-memory value.
  }
}
