import { useQuery } from "@tanstack/react-query";
import type { GetItemRequest } from "../types/backend";
import { getItems } from "../api/items";

export function useItems(filter: GetItemRequest = {}) {
  return useQuery({
    queryKey: ["items", filter],
    queryFn: () => getItems(filter),
  });
}
