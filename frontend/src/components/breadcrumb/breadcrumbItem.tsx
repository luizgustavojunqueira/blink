import { useItem } from "../../hooks/useItems";
import type { Pane } from "../../lib/pane/types";

interface IBreadcrumbItem {
  pane: Pane;
  isLast: boolean;
}

export default function BreadcrumbItem({ pane, isLast }: IBreadcrumbItem) {
  let itemId = "";

  if (pane.type === "list" && pane.parentId) {
    itemId = pane.parentId;
  } else if (pane.type === "detail") {
    itemId = pane.itemId;
  }

  const item = useItem(itemId);

  const label = item?.title ?? (pane.type === "list" && !pane.parentId ? "Home" : "...");

  return (
    <span title={label} className={`truncate max-w-40 ${isLast ? "text-fg font-medium" : ""}`}>
      {label}
    </span>
  );
}
