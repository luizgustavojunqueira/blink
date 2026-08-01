import { useState } from "react";
import { useItems } from "../../hooks/useItems";
import Loading from "../loading";
import Prompt from "../prompt";
import Item from "./item";
import type { GetItemRequest } from "../../types/backend";

export function ItemList() {
  const [filter, setFilter] = useState<GetItemRequest>({});

  const { data: items = [], isFetching, isError, error } = useItems(filter);

  return (
    <div className="w-full">
      <Prompt onFilter={setFilter} />
      {isFetching && <Loading />}
      {isError && <div className="text-urgent p-4">erro: {error.message}</div>}
      <ul className="gap-1">
        {items.map((item) => (
          <Item key={item.guid} item={item} />
        ))}
      </ul>
    </div>
  );
}
