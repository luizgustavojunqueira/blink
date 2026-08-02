import { useState } from "react";
import { useItems } from "../../hooks/useItems";
import Loading from "../loading";
import Prompt from "../prompt/prompt";
import Item from "./item";
import type { GetItemRequest } from "../../types/backend";

export function ItemList() {
  const [filter, setFilter] = useState<GetItemRequest>({});
  const { data: items = [], isFetching, isError, error } = useItems(filter);

  return (
    <div className="w-full h-full flex flex-col">
      <Prompt onFilter={setFilter} />

      <div className="flex-1 overflow-y-auto">
        {isFetching && <Loading />}

        {isError && (
          <div className="px-4 py-2 text-urgent text-sm">
            erro: {error.message}
          </div>
        )}

        <ul className="flex flex-col">
          {items.map((item) => (
            <Item key={item.guid} item={item} />
          ))}
        </ul>

        {!isFetching && items.length === 0 && (
          <div className="px-4 py-6 text-fg-muted text-sm">no items</div>
        )}
      </div>
    </div>
  );
}
