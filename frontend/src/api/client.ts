const BASE_URL = "/api";

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

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body.trim() || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}
