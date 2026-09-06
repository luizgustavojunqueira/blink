import { useItems } from "../../hooks/useItems";
import Loading from "../loading";
import Prompt from "../prompt/prompt";
import Item from "./item";
import SelectionScroller from "./selectionScroller";
import { useEffect, useRef } from "react";
import { paneIsActive, usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { useUiStore } from "../../stores/ui";
import type { GetItemRequest, ItemType } from "../../types/backend";
import Breadcrumb from "../breadcrumb/breadcrumb";

const EMPTY_FILTER: GetItemRequest = {};

const selectFilter: PaneSelector<GetItemRequest> = (pane) =>
  pane?.type === "list" ? pane.filter : EMPTY_FILTER;

interface IItemList {
  paneId: string;
}

export function ItemList({ paneId }: IItemList) {
  const filter = usePaneValue(paneId, selectFilter);
  const isActive = usePaneValue(paneId, paneIsActive);
  const setRendered = useUiStore((s) => s.setRendered);

  const { data: items = [], isFetching, isError } = useItems(filter);

  const renderedKey = items.map((item) => `${item.guid}:${item.type}`).join(",");

  useEffect(() => {
    const ids: string[] = [];
    const types: Record<string, ItemType> = {};

    for (const entry of renderedKey ? renderedKey.split(",") : []) {
      const sep = entry.lastIndexOf(":");
      const id = entry.slice(0, sep);
      ids.push(id);
      types[id] = entry.slice(sep + 1);
    }

    setRendered(paneId, ids, types);
  }, [renderedKey, paneId, setRendered]);

  const listRef = useRef<HTMLUListElement>(null);

  return (
    <div
      className={`w-full h-full flex flex-col border ${isActive ? "border-b-accent" : "border-bg"}`}
    >
      <Prompt paneId={paneId} />
      <div className="px-5">
        <Breadcrumb paneId={paneId} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isFetching && <Loading />}

        {isError && <div className="px-4 py-2 text-urgent text-sm">could not load items</div>}

        <ul ref={listRef} className="flex flex-col">
          {items.map((item) => (
            <Item key={item.guid} item={item} paneId={paneId} />
          ))}
        </ul>

        <SelectionScroller paneId={paneId} listRef={listRef} />

        {!isFetching && items.length === 0 && (
          <div className="px-4 py-6 text-fg-muted text-sm">no items</div>
        )}
      </div>
    </div>
  );
}
