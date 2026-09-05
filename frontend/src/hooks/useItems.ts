import { useQuery } from "@tanstack/react-query";
import type { GetItemRequest, GetItemResponse } from "../types/backend";
import { getItems, getTags } from "../api/items";
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

export function useItems(filter: GetItemRequest = {}) {
  return useQuery({
    queryKey: ["items", filter],
    queryFn: async () => {
      if (USE_MOCK_ITEMS) return applyMockFilter(generateMockItems(), filter);
      return getItems(filter);
    },
  });
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
