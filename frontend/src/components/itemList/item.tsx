import { newId } from "../../lib/id";
import { memo } from "react";
import { useUiStore } from "../../stores/ui";
import { ROW_IN_RANGE, ROW_MARKED, ROW_SELECTED, useRowState } from "../../hooks/useRowState";
import { createDetailPane } from "../../lib/pane/factories";
import type { GetItemResponse } from "../../types/backend";
import { priorityColor, priorityMapper, statusColor, statusMapper } from "../../utils/status";

const markedBoxState = (
  isMarked: boolean,
  isSelected: boolean,
  isInVisualRange: boolean,
) => {
  if (isMarked) return "border-accent opacity-100";
  if (isInVisualRange) return "border-accent/60 opacity-100";
  if (isSelected) return "border-border opacity-100";
  return "border-border opacity-0 group-hover:opacity-100";
};

interface IItem {
  item: GetItemResponse;
  paneId: string;
}

function ItemComponent({ item, paneId }: IItem) {
  const isDone = item.status === "DONE" || item.status === "CANCELED";

  const state = useRowState(paneId, item.guid);
  const isSelected = (state & ROW_SELECTED) !== 0;
  const isMarked = (state & ROW_MARKED) !== 0;
  const isInVisualRange = (state & ROW_IN_RANGE) !== 0;

  return (
    <li
      data-item-guid={item.guid}
      className={[
        "group flex w-full flex-row items-center gap-1",
        "transition-colors",
        isSelected
          ? "bg-bg-lighter duration-0"
          : isInVisualRange
            ? "bg-accent/10 duration-200"
            : "hover:bg-bg-soft duration-200",
        "[content-visibility:auto] [contain-intrinsic-size:auto_2rem]",
      ].join(" ")}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-pressed={isMarked}
        aria-label={`Toggle marked: ${item.title}`}
        onClick={() => useUiStore.getState().toggleMarked(paneId, item.guid)}
        className={[
          "ml-2 flex size-4 shrink-0 items-center justify-center",
          "rounded-[3px] border bg-transparent",
          "transition-[opacity,border-color] duration-150 ease-out",
          markedBoxState(isMarked, isSelected, isInVisualRange),
        ].join(" ")}
      >
        <svg viewBox="0 0 12 12" className="size-3.5" fill="none" aria-hidden="true">
          <path
            d="M2 6.3L4.7 9L10 3.4"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            className={[
              "stroke-accent [stroke-dasharray:1]",
              "transition-[stroke-dashoffset,opacity] duration-200 ease-out",
              isMarked
                ? "[stroke-dashoffset:0] opacity-100"
                : isInVisualRange
                  ? "[stroke-dashoffset:0] opacity-40"
                  : "[stroke-dashoffset:1] opacity-0",
            ].join(" ")}
          />
        </svg>
      </button>

      <div
        onClick={() => useUiStore.getState().select(paneId, item.guid)}
        onDoubleClick={() => {
          const ui = useUiStore.getState();
          ui.select(paneId, item.guid);
          ui.pushPane(createDetailPane(newId(), item.guid));
        }}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-1.5"
      >
        <span className={`w-20 shrink-0 text-sm ${statusColor[item.status] ?? "text-fg-dim"}`}>
          {statusMapper[item.status]}
        </span>

        <span className={`w-16 shrink-0 text-sm ${priorityColor[item.priority] ?? "text-fg-dim"}`}>
          {item.priority !== "NORMAL" && priorityMapper[item.priority]}
        </span>

        <span className={`flex-3 truncate ${isDone ? "text-fg-muted line-through" : "text-fg"}`}>
          {item.type === "GROUP" && <span className="mr-1 text-group">▸</span>}
          {item.title}
        </span>

        <div className="flex flex-1 flex-row truncate">
          {item.tags?.length > 0 && (
            <div className="mr-4 flex gap-1.5">
              {item.tags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="text-sm text-tag align-left">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {item.description && (
            <span className="hidden truncate text-xs text-fg-muted sm:block">
              {item.description}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

const Item = memo(ItemComponent);

export default Item;
