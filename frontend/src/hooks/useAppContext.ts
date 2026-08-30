import { useCallback, useMemo } from "react";
import { createItem, updateItem } from "../api/items";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setTheme } from "../lib/theme";
import { useUiStore } from "../stores/ui";
import type { AppContext } from "../lib/types";
import type {
  GetItemResponse,
  ItemPriority,
  ItemStatus,
  UpdateItemRequest,
} from "../types/backend";

export function useAppContext(): AppContext {
  const queryClient = useQueryClient();
  const ui = useUiStore();

  const { mutateAsync: create } = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  const { mutateAsync: update } = useMutation({
    mutationFn: updateItem,
    onSuccess: (updated) => {
      queryClient.setQueriesData<GetItemResponse[]>({ queryKey: ["items"] }, (old) =>
        old?.map((i) => (i.guid === updated.guid ? updated : i)),
      );
    },
  });

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
