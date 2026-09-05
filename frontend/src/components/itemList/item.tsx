import { memo, useCallback } from "react";
import { useUiStore } from "../../stores/ui";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { createDetailPane } from "../../lib/pane/factories";
import type { GetItemResponse } from "../../types/backend";
import { priorityColor, priorityMapper, statusColor, statusMapper } from "../../utils/status";

interface IItem {
  item: GetItemResponse;
  paneId: string;
}

function ItemComponent({ item, paneId }: IItem) {
  const isDone = item.status === "DONE" || item.status === "CANCELED";

  const selectIsSelected = useCallback<PaneSelector<boolean>>(
    (pane) => pane?.type === "list" && pane.selectedId === item.guid,
    [item.guid],
  );

  const isSelected = usePaneValue(paneId, selectIsSelected);

  const select = useUiStore((s) => s.select);
  const pushPane = useUiStore((s) => s.pushPane);

  return (
    <li
      data-item-id={item.guid}
      className={`group w-full px-4 py-1.5 flex items-center gap-3 transition-colors duration-75 ${
        isSelected ? "bg-bg-lighter" : "hover:bg-bg-soft"
      }`}
      onClick={() => select(paneId, item.guid)}
      onDoubleClick={() => {
        select(paneId, item.guid);

        pushPane(createDetailPane(crypto.randomUUID(), item.guid, item.guid));
      }}
    >
      <span className={`text-sm w-20 shrink-0 ${statusColor[item.status] ?? "text-fg-dim"}`}>
        {statusMapper[item.status]}
      </span>

      <span className={`text-sm w-16 shrink-0 ${priorityColor[item.priority] ?? "text-fg-dim"}`}>
        {item.priority !== "NORMAL" && priorityMapper[item.priority]}
      </span>

      <span className={`flex-3 truncate ${isDone ? "text-fg-muted line-through" : "text-fg"}`}>
        {item.type === "GROUP" && <span className="text-group mr-1">▸</span>}
        {item.title}
      </span>

      <div className="flex flex-row flex-1 truncate">
        {item.tags?.length > 0 && (
          <div className="flex gap-1.5 mr-4">
            {item.tags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="text-tag text-sm align-left">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {item.description && (
          <span className="text-fg-muted text-xs truncate hidden sm:block">{item.description}</span>
        )}
      </div>
    </li>
  );
}

const Item = memo(ItemComponent);
export default Item;
