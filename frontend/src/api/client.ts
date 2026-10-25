const BASE_URL = "/api";

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function api<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (res.status === 401 && !endpoint.startsWith("/auth/")) onUnauthorized?.();

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body.trim() || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}
