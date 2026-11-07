const BASE_URL = "/api";

export class ApiError extends Error {
  readonly code: string | null;
  readonly status: number;

  constructor(message: string, code: string | null, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function parseJson(body: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toApiError(body: string, status: number) {
  const parsed = parseJson(body);
  if (typeof parsed?.message === "string") {
    return new ApiError(parsed.message, typeof parsed.code === "string" ? parsed.code : null, status);
  }
  return new ApiError(body.trim() || `HTTP ${status}`, null, status);
}

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
    throw toApiError(body, res.status);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}
