import { useCallback, useMemo } from "react";
import { createItem, updateItem } from "../api/items";
import { useQueryClient } from "@tanstack/react-query";
import { setTheme } from "../lib/theme";
import { useUiStore } from "../stores/ui";
import type { AppContext } from "../lib/types";
import type {
  CreateItemRequest,
  GetItemResponse,
  ItemPriority,
  ItemStatus,
  UpdateItemRequest,
} from "../types/backend";

export function useAppContext(): AppContext {
  const queryClient = useQueryClient();
  const ui = useMemo(() => useUiStore.getState(), []);

  const create = useCallback(
    async (req: CreateItemRequest) => {
      const created = await createItem(req);

      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });

      return created;
    },
    [queryClient],
  );

  const update = useCallback(
    async (req: UpdateItemRequest) => {
      const updated = await updateItem(req);

      queryClient.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
        old?.map((i) => (i.guid === updated.guid ? updated : i)),
      );

      queryClient.invalidateQueries({ queryKey: ["tags"] });

      return updated;
    },
    [queryClient],
  );

  const findItem = useCallback(
    (guid: string) => {
      for (const [, list] of queryClient.getQueriesData<GetItemResponse[]>({
        queryKey: ["items"],
      })) {
        const hit = list?.find((i) => i.guid === guid);
        if (hit) return hit;
      }
    },
    [queryClient],
  );

  const setField = useCallback(
    (
      guid: string,
      key: keyof UpdateItemRequest,
      value: string | string[] | ItemStatus | ItemPriority,
    ) => {
      const current = findItem(guid);
      if (current && current[key] === value) return;
      return update({ guid, [key]: value });
    },
    [update, findItem],
  );

  return useMemo(
    () => ({
      ui,
      setTheme,
      items: {
        findItem,
        setField,
        create,
        update,
      },
    }),
    [ui, create, update, setField, findItem],
  );
}
