import { useItem } from "../../hooks/useItems";
import type { PaneType } from "../../lib/pane/types";
import { t } from "../../lib/i18n";

interface IBreadcrumbItem {
  type: PaneType;
  guid: string | null;
  isLast: boolean;
}

export default function BreadcrumbItem({ type, guid, isLast }: IBreadcrumbItem) {
  const item = useItem(guid ?? "");

  const label =
    type === "config"
      ? t("Config")
      : type === "profile"
        ? t("Profile")
        : type === "history"
          ? t("History")
          : (item?.title ?? (type === "list" && !guid ? t("Home") : "..."));

  return (
    <span title={label} className={`truncate max-w-40 ${isLast ? "text-fg font-medium" : ""}`}>
      {label}
    </span>
  );
}
