import type { GetItemRequest, GetItemResponse } from "../types/backend";
import { api } from "./client";

export function getItems(filter: GetItemRequest = {}) {
  const search = new URLSearchParams();

  Object.entries(filter).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.set(key, String(value));
    }
  });

  const query = search.toString();

  return api<GetItemResponse[]>(`/items${query ? `?${query}` : ""}`);
}
