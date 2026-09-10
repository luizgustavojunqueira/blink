import type { QueryClient } from "@tanstack/react-query";
import { bulkUpdateItem, createItem, updateItem } from "../api/items";
import { useUiStore } from "../stores/ui";
import { queryClient } from "./queryClient";
import { setTheme } from "./theme";
import type { AppContext, ItemPatch } from "./types";
import type { CreateItemRequest, GetItemResponse, UpdateItemRequest } from "../types/backend";

function sameValue(current: unknown, next: unknown): boolean {
  if (Array.isArray(current) && Array.isArray(next)) {
    if (current.length !== next.length) return false;
    const a = [...current].sort();
    const b = [...next].sort();
    return a.every((value, i) => value === b[i]);
  }

  return current === next;
}

export function createItemActions(client: QueryClient): AppContext["items"] {
  const findItem = (guid: string) => {
    for (const [, list] of client.getQueriesData<GetItemResponse[]>({
      queryKey: ["items"],
    })) {
      const hit = list?.find((i) => i.guid === guid);
      if (hit) return hit;
    }
  };

  const findItems = (guids: string[]) => {
    const allItems: GetItemResponse[] = [];
    for (const [, list] of client.getQueriesData<GetItemResponse[]>({
      queryKey: ["items"],
    })) {
      if (list) allItems.push(...list);
    }
    return allItems.filter((i) => guids.includes(i.guid));
  };

  const create = async (req: CreateItemRequest) => {
    const created = await createItem(req);

    client.invalidateQueries({ queryKey: ["items"] });
    client.invalidateQueries({ queryKey: ["tags"] });

    return created;
  };

  const update = async (req: UpdateItemRequest) => {
    const updated = await updateItem(req);

    client.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
      old?.map((i) => (i.guid === updated.guid ? updated : i)),
    );

    client.invalidateQueries({ queryKey: ["tags"] });

    return updated;
  };

  const bulkUpdate = async (guids: string[], patch: ItemPatch) => {
    const updated = await bulkUpdateItem({ guids, ...patch });

    client.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
      old?.map((oldItem) => updated.find((u) => u.guid === oldItem.guid) ?? oldItem),
    );

    client.invalidateQueries({ queryKey: ["tags"] });

    return guids;
  };

  const setField = (guid: string, key: keyof UpdateItemRequest, value: string | string[]) => {
    const current = findItem(guid);
    if (current && sameValue(current[key], value)) return;
    return update({ guid, [key]: value });
  };

  const bulkSetFields = async (guids: string[], patch: ItemPatch) => {
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return [];

    const updateableGuids = findItems(guids)
      .filter((item) =>
        entries.some(([key, value]) => !sameValue(item[key as keyof GetItemResponse], value)),
      )
      .map((i) => i.guid);

    if (updateableGuids.length === 0) return [];

    return bulkUpdate(updateableGuids, patch);
  };

  return { findItem, setField, create, update, bulkSetFields };
}

export function createAppContext(client: QueryClient): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme,
    items: createItemActions(client),
  };
}

const appContext = createAppContext(queryClient);

export function getAppContext(): AppContext {
  return appContext;
}

export function getItemActions(): AppContext["items"] {
  return appContext.items;
}
