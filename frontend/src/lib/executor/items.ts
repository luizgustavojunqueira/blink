import { getItems } from "../../api/items";
import type { GetItemRequest } from "../../types/backend";
import { queryClient } from "../queryClient";

export async function filter(filter: GetItemRequest) {
  await queryClient.fetchQuery({
    queryKey: ["items", filter],
    queryFn: () => getItems(filter),
  });
}
