import type { QueryClient } from "@tanstack/react-query";
import { bulkUpdateItem, createItem, updateItem } from "../api/items";
import { useUiStore } from "../stores/ui";
import { queryClient } from "./queryClient";
import { setTheme } from "./theme";
import type { AppContext } from "./types";
import type {
  BulkUpdateItemRequest,
  CreateItemRequest,
  GetItemResponse,
  ItemPriority,
  ItemStatus,
  UpdateItemRequest,
} from "../types/backend";

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

  const bulkUpdate = async (req: BulkUpdateItemRequest) => {
    const updated = await bulkUpdateItem(req);
    client.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
      old?.map((oldItem) => updated.find((u) => u.guid === oldItem.guid) ?? oldItem),
    );
  };

  const setField = (
    guid: string,
    key: keyof UpdateItemRequest,
    value: string | string[] | ItemStatus | ItemPriority,
  ) => {
    const current = findItem(guid);
    if (current && current[key] === value) return;
    return update({ guid, [key]: value });
  };

  const bulkSetField = (
    guids: string[],
    key: keyof Omit<BulkUpdateItemRequest, "guids">,
    value: string | string[] | ItemStatus | ItemPriority,
  ) => {
    const updateableGuids = findItems(guids)
      ?.filter((i) => i[key] != value)
      .map((i) => i.guid);
    if (updateableGuids === undefined || updateableGuids.length === 0) return;
    return bulkUpdate({ guids: updateableGuids, [key]: value });
  };

  return { findItem, setField, create, update, bulkSetField };
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
