import type { HealthResponse, StatusResponse } from "./types";

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`${path} 요청 실패: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getBackendHealth() {
  return requestJson<HealthResponse>("/health");
}

export function getDatabaseHealth() {
  return requestJson<HealthResponse>("/api/db/health");
}

export function getSystemStatus() {
  return requestJson<StatusResponse>("/api/status");
}
