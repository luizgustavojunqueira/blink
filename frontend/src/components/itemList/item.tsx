import { usePane } from "../../hooks/usePane";
import type { GetItemResponse, ItemPriority, ItemStatus } from "../../types/backend";

interface IItem {
  item: GetItemResponse;
  isSelected: boolean;
  paneId: string;
}

const priorityColor: Record<ItemPriority, string> = {
  URGENT: "text-urgent",
  HIGH: "text-high",
  NORMAL: "text-normal",
  LOW: "text-low",
};

const statusColor: Record<ItemStatus, string> = {
  TODO: "text-fg-dim",
  IN_PROGRESS: "text-accent",
  DONE: "text-done",
  CANCELED: "text-fg-muted",
  ARCHIVED: "text-fg-muted",
};

export default function Item({ item, isSelected, paneId }: IItem) {
  const isDone = item.status === "DONE" || item.status === "CANCELED";
  const t = usePane(paneId);

  const select = t.select;
  return (
    <li
      className={`group w-full px-4 py-1.5 flex items-center gap-3 transition-colors duration-75 ${
        isSelected ? "bg-bg-lighter" : "hover:bg-bg-soft"
      }`}
      onClick={() => select(item.guid)}
    >
      <span className={`text-sm w-20 shrink-0 ${statusColor[item.status] ?? "text-fg-dim"}`}>
        {item.status === "IN_PROGRESS" ? "PROG" : item.status}
      </span>

      <span className={`text-sm w-16 shrink-0 ${priorityColor[item.priority] ?? "text-fg-dim"}`}>
        {item.priority !== "NORMAL" ? item.priority : ""}
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
