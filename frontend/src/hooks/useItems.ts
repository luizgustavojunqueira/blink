import { useQuery } from "@tanstack/react-query";
import type { GetItemRequest } from "../types/backend";
import { getItems, getTags } from "../api/items";

export function useItems(filter: GetItemRequest = {}) {
  return useQuery({
    queryKey: ["items", filter],
    queryFn: () => getItems(filter),
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
