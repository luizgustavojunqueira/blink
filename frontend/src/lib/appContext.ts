import type { QueryClient } from "@tanstack/react-query";
import { bulkUpdateItem, createItem, deleteItems, restoreItems, updateItem } from "../api/items";
import { useUiStore } from "../stores/ui";
import { queryClient } from "./queryClient";
import { useConfigStore } from "./config/store";
import { configRows } from "./config/rows";
import type { AppContext, ItemPatch } from "./types";
import {
  Group,
  type CreateItemRequest,
  type GetItemResponse,
  type UpdateItemRequest,
} from "../types/backend";

function sameValue(current: unknown, next: unknown): boolean {
  if (Array.isArray(current) && Array.isArray(next)) {
    if (current.length !== next.length) return false;
    const a = [...current].sort();
    const b = [...next].sort();
    return a.every((value, i) => value === b[i]);
  }

  return current === next;
}

type Flight = { controller: AbortController; original: unknown };

export function createItemActions(client: QueryClient): AppContext["items"] {
  const flights = new Map<string, Flight>();
  const removed: string[][] = [];

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

  const patchItem = (guid: string, patch: Partial<GetItemResponse>) =>
    client.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
      old?.map((i) => (i.guid === guid ? { ...i, ...patch } : i)),
    );

  const create = async (req: CreateItemRequest) => {
    const created = await createItem(req);

    client.invalidateQueries({ queryKey: ["items"] });
    client.invalidateQueries({ queryKey: ["tags"] });
    if (req.type === Group) client.invalidateQueries({ queryKey: ["groups"] });

    return created;
  };

  const update = async (req: UpdateItemRequest, signal?: AbortSignal) => {
    const updated = await updateItem(req, signal);

    const fields = Object.keys(req).filter((k) => k !== "guid") as (keyof GetItemResponse)[];
    const changed = Object.fromEntries(fields.map((k) => [k, updated[k]]));

    client.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
      old?.map((i) => (i.guid === updated.guid ? { ...i, ...changed } : i)),
    );

    if (req.tags !== undefined) client.invalidateQueries({ queryKey: ["tags"] });
    if (req.title !== undefined && updated.type === Group) {
      client.invalidateQueries({ queryKey: ["groups"] });
    }

    return updated;
  };

  const bulkUpdate = async (guids: string[], patch: ItemPatch) => {
    const updated = await bulkUpdateItem({ guids, ...patch });

    client.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
      old?.map((oldItem) => updated.find((u) => u.guid === oldItem.guid) ?? oldItem),
    );

    client.invalidateQueries({ queryKey: ["tags"] });
    if (patch.parent_guid !== undefined) client.invalidateQueries({ queryKey: ["groups"] });

    return guids;
  };

  const setField = (guid: string, key: keyof UpdateItemRequest, value: string | string[]) => {
    const current = findItem(guid);
    if (current && sameValue(current[key], value)) return;
    const stateKey = `${guid}:${key}`;
    const previous = flights.get(stateKey);
    previous?.controller.abort();

    const flight: Flight = {
      controller: new AbortController(),
      original: previous ? previous.original : current?.[key as keyof GetItemResponse],
    };
    flights.set(stateKey, flight);

    patchItem(guid, { [key]: value } as Partial<GetItemResponse>);
    useUiStore.getState().setFieldState(stateKey, { status: "saving" });

    return update({ guid, [key]: value }, flight.controller.signal).then(
      () => {
        if (flights.get(stateKey) !== flight) return;
        flights.delete(stateKey);
        useUiStore.getState().setFieldState(stateKey, null);
      },
      (err: unknown) => {
        if (flights.get(stateKey) !== flight) return;
        flights.delete(stateKey);
        patchItem(guid, { [key]: flight.original } as Partial<GetItemResponse>);
        useUiStore.getState().setFieldState(stateKey, {
          status: "error",
          message: err instanceof Error ? err.message : "save failed",
        });
      },
    );
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

  const remove = async (guids: string[]) => {
    if (guids.length === 0) return;

    const gone = new Set(guids);
    client.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
      old?.filter((i) => !gone.has(i.guid)),
    );
    removed.push(guids);

    try {
      await deleteItems({ guids });
    } catch (err) {
      removed.splice(removed.lastIndexOf(guids), 1);
      client.invalidateQueries({ queryKey: ["items"] });
      throw err;
    }

    client.invalidateQueries({ queryKey: ["tags"] });
    client.invalidateQueries({ queryKey: ["groups"] });
  };

  const undo = async () => {
    const guids = removed.pop();
    if (!guids) return 0;

    try {
      const restored = await restoreItems({ guids });
      client.invalidateQueries({ queryKey: ["items"] });
      client.invalidateQueries({ queryKey: ["tags"] });
      client.invalidateQueries({ queryKey: ["groups"] });
      return restored.length;
    } catch (err) {
      removed.push(guids);
      throw err;
    }
  };

  return { findItem, setField, create, update, bulkSetFields, remove, undo };
}

function createConfigActions(): AppContext["config"] {
  const store = () => useConfigStore.getState();

  return {
    get: store,
    rows: () => configRows(store()),
    setTheme: (name) => store().setTheme(name),
    setKeys: (bindingId, input) => store().setKeys(bindingId, input),
    resetKeys: (bindingId) => store().resetKeys(bindingId),
    duplicateTheme: (from) => store().duplicateTheme(from),
    renameTheme: (from, input) => store().renameTheme(from, input),
    deleteTheme: (name) => store().deleteTheme(name),
    setThemeColor: (name, token, input) => store().setThemeColor(name, token, input),
  };
}

export function createAppContext(client: QueryClient): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: (theme) => {
      useConfigStore.getState().setTheme(theme);
    },
    config: createConfigActions(),
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
