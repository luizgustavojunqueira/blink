import { useItem } from "../../hooks/useItems";
import type { PaneType } from "../../lib/pane/types";

interface IBreadcrumbItem {
  type: PaneType;
  guid: string | null;
  isLast: boolean;
}

export default function BreadcrumbItem({ type, guid, isLast }: IBreadcrumbItem) {
  const item = useItem(guid ?? "");

  const label =
    type === "config" ? "Config" : (item?.title ?? (type === "list" && !guid ? "Home" : "..."));

  return (
    <span title={label} className={`truncate max-w-40 ${isLast ? "text-fg font-medium" : ""}`}>
      {label}
    </span>
  );
}
