import type { QueryClient } from "@tanstack/react-query";
import { createItem, updateItem } from "../api/items";
import { useUiStore } from "../stores/ui";
import { queryClient } from "./queryClient";
import { setTheme } from "./theme";
import type { AppContext } from "./types";
import type {
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

  const setField = (
    guid: string,
    key: keyof UpdateItemRequest,
    value: string | string[] | ItemStatus | ItemPriority,
  ) => {
    const current = findItem(guid);
    if (current && current[key] === value) return;
    return update({ guid, [key]: value });
  };

  return { findItem, setField, create, update };
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
