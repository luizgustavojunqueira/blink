import { useItems } from "../../hooks/useItems";
import Loading from "../loading";
import Prompt from "../prompt/prompt";
import Item from "./item";
import type { AppContext } from "../../lib/types";
import { useUiStore } from "../../stores/ui";
import { useEffect } from "react";

interface IItemList {
  app: AppContext;
}

export function ItemList({ app }: IItemList) {
  const { data: items = [], isFetching, isError, error } = useItems(app.ui.filter);

  const selectedId = useUiStore((s) => s.selectedId);
  const setRenderedIds = useUiStore((s) => s.setRenderedIds);

  const idsString = items.map((item) => item.guid).join(",");

  useEffect(() => {
    setRenderedIds(idsString ? idsString.split(",") : []);
  }, [idsString, setRenderedIds]);

  return (
    <div className="w-full h-full flex flex-col">
      <Prompt app={app} />

      <div className="flex-1 overflow-y-auto">
        {isFetching && <Loading />}

        {isError && <div className="px-4 py-2 text-urgent text-sm">erro: {error.message}</div>}

        <ul className="flex flex-col">
          {items.map((item) => (
            <Item key={item.guid} item={item} isSelected={item.guid === selectedId} />
          ))}
        </ul>

        {!isFetching && items.length === 0 && (
          <div className="px-4 py-6 text-fg-muted text-sm">no items</div>
        )}
      </div>
    </div>
  );
}
