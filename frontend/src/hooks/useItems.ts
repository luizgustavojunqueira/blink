import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import type { GetItemRequest, GetItemResponse } from "../types/backend";
import { getAgents } from "../api/agents";
import { getItemHistory, getItems, getTags } from "../api/items";
import { generateMockItems } from "../utils/mockItems";

const USE_MOCK_ITEMS = import.meta.env.VITE_USE_MOCK_ITEMS === "true";

function applyMockFilter(items: GetItemResponse[], filter: GetItemRequest) {
  return items.filter((item) => {
    if (filter.title && !item.title.toLowerCase().includes(filter.title.toLowerCase()))
      return false;
    if (filter.status?.length && !filter.status.includes(item.status)) return false;
    if (filter.priority?.length && !filter.priority.includes(item.priority)) return false;
    if (filter.type?.length && !filter.type.includes(item.type)) return false;
    return true;
  });
}

export const itemsQuery = (filter: GetItemRequest) => ({
  queryKey: ["items", filter] as const,
  queryFn: async () => {
    if (USE_MOCK_ITEMS) return applyMockFilter(generateMockItems(), filter);
    return getItems(filter);
  },
});

export function useItems(filter: GetItemRequest = {}) {
  return useQuery(itemsQuery(filter));
}

export const groupsQuery = () => ({
  queryKey: ["groups"] as const,
  queryFn: () => getItems({ type: ["GROUP"], recursive: true, order: ["title"] }),
});

export function useGroups() {
  return useQuery(groupsQuery());
}

export const agentsQuery = () => ({
  queryKey: ["agents"] as const,
  queryFn: getAgents,
});

export function useAgents() {
  return useQuery(agentsQuery());
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await getTags();
      return res.tags ?? [];
    },
  });
}

export function useItem(guid: string) {
  const queryClient = useQueryClient();

  const subscribe = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(onChange),
    [queryClient],
  );

  const getSnapshot = useCallback(() => {
    for (const [, list] of queryClient.getQueriesData<GetItemResponse[]>({ queryKey: ["items"] })) {
      const hit = list?.find((i) => i.guid === guid);
      if (hit) return hit;
    }
  }, [queryClient, guid]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

export const itemHistoryQuery = (guid: string) => ({
  queryKey: ["history", guid] as const,
  queryFn: () => getItemHistory(guid),
  enabled: guid !== "",
});

export function useItemHistory(guid: string) {
  return useQuery(itemHistoryQuery(guid));
}
