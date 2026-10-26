import { memo, useCallback, useEffect, useRef } from "react";
import { paneIsActive, usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { useItemHistory } from "../../hooks/useItems";
import { useUiStore } from "../../stores/ui";
import type { ItemHistoryEntry } from "../../types/backend";
import Breadcrumb from "../breadcrumb/breadcrumb";

interface IHistoryPane {
  paneId: string;
}

const selectItemGuid: PaneSelector<string> = (pane) => (pane?.type === "history" ? pane.itemGuid : "");

const pad = (n: number) => String(n).padStart(2, "0");

const formatTime = (at: string) => {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const change = (e: ItemHistoryEntry) => {
  switch (e.field) {
    case "created":
      return e.new_value ?? "";
    case "deleted":
    case "restored":
      return "";
    default:
      return `${e.old_value ?? "none"} → ${e.new_value ?? "none"}`;
  }
};

interface IHistoryRow {
  paneId: string;
  index: number;
  entry: ItemHistoryEntry;
}

const HistoryRow = memo(function HistoryRow({ paneId, index, entry }: IHistoryRow) {
  const ref = useRef<HTMLLIElement>(null);
  const selectRowAction = useUiStore((s) => s.selectRow);
  const rowId = String(index);
  const select = useCallback<PaneSelector<boolean>>(
    (pane) => pane?.type === "history" && pane.selectedRow === rowId,
    [rowId],
  );
  const isSelected = usePaneValue(paneId, select);

  useEffect(() => {
    if (isSelected) ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [isSelected]);

  return (
    <li
      ref={ref}
      data-row-id={rowId}
      aria-selected={isSelected}
      onClick={() => selectRowAction(paneId, rowId)}
      className={`flex min-w-0 items-baseline gap-3 px-4 py-0.5 ${isSelected ? "bg-bg-lighter" : "hover:bg-bg-soft"}`}
    >
      <span className="w-32 shrink-0 text-xs text-fg-muted">{formatTime(entry.at)}</span>
      <span className="w-24 shrink-0 truncate text-xs text-fg-dim">{entry.actor ?? "removed user"}</span>
      <span className="w-24 shrink-0 text-accent">{entry.field}</span>
      <span className="flex-1 truncate text-fg">{change(entry)}</span>
    </li>
  );
});

export default function HistoryPane({ paneId }: IHistoryPane) {
  const isActive = usePaneValue(paneId, paneIsActive);
  const itemGuid = usePaneValue(paneId, selectItemGuid);
  const { data, isLoading, isError } = useItemHistory(itemGuid);

  return (
    <div
      className={`w-full h-full flex flex-col border p-4 text-sm transition-colors duration-75 ${
        isActive ? "border-b-accent" : "border-bg"
      }`}
    >
      <Breadcrumb paneId={paneId} />
      {isLoading && <span className="px-4 pt-4 text-fg-muted">loading</span>}
      {isError && <span className="px-4 pt-4 text-danger">could not load the history</span>}
      {data && data.length === 0 && <span className="px-4 pt-4 text-fg-muted">no changes yet</span>}
      {data && data.length > 0 && (
        <ul className="flex-1 overflow-y-auto">
          {data.map((entry, i) => (
            <HistoryRow key={i} paneId={paneId} index={i} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
