import { useItems } from "../../hooks/useItems";
import Loading from "../loading";
import Prompt from "../prompt/prompt";
import Item from "./item";
import { useEffect } from "react";
import { useListPane } from "../../hooks/usePane";

interface IItemList {
  paneId: string;
}

export function ItemList({ paneId }: IItemList) {
  const t = useListPane(paneId);

  const { data: items = [], isFetching, isError, error } = useItems(t.pane.filter);

  const idsString = items.map((item) => item.guid).join(",");

  useEffect(() => {
    if (!t) return;
    t.setRenderedIds(idsString ? idsString.split(",") : []);
  }, [idsString, t]);

  return (
    <div className="w-full h-full flex flex-col">
      <Prompt paneId={paneId} />

      <div className="flex-1 overflow-y-auto">
        {isFetching && <Loading />}

        {isError && <div className="px-4 py-2 text-urgent text-sm">erro: {error.message}</div>}

        <ul className="flex flex-col">
          {items.map((item) => (
            <Item
              key={item.guid}
              item={item}
              isSelected={item.guid === t.pane.selectedId}
              paneId={paneId}
            />
          ))}
        </ul>

        {!isFetching && items.length === 0 && (
          <div className="px-4 py-6 text-fg-muted text-sm">no items</div>
        )}
      </div>
    </div>
  );
}
