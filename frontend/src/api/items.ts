import type {
  BulkUpdateItemRequest,
  CreateItemRequest,
  GetItemRequest,
  GetItemResponse,
  GetTagsResponse,
  ItemHistoryEntry,
  ItemGuidsRequest,
  UpdateItemRequest,
} from "../types/backend";
import { api } from "./client";

export function getItems(filter: GetItemRequest = {}, signal?: AbortSignal) {
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

  return api<GetItemResponse[]>(`/items${query ? `?${query}` : ""}`, { signal });
}

export function createItem(req: CreateItemRequest) {
  return api<GetItemResponse>("/items", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function updateItem(req: UpdateItemRequest, signal?: AbortSignal) {
  return api<GetItemResponse>("/items", {
    method: "PATCH",
    body: JSON.stringify(req),
    signal,
  });
}

export function getTags() {
  return api<GetTagsResponse>("/tags");
}

export function bulkUpdateItem(req: BulkUpdateItemRequest) {
  return api<GetItemResponse[]>("/items/bulk", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function deleteItems(req: ItemGuidsRequest) {
  return api<void>("/items", {
    method: "DELETE",
    body: JSON.stringify(req),
  });
}

export function restoreItems(req: ItemGuidsRequest) {
  return api<GetItemResponse[]>("/items/restore", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function getItemHistory(guid: string) {
  return api<ItemHistoryEntry[]>(`/items/${encodeURIComponent(guid)}/history`);
}
