import { useCallback } from "react";
import { useCachedSelector } from "../../hooks/usePane";
import type { PaneType } from "../../lib/pane/types";
import type { UiState } from "../../stores/ui";
import BreadcrumbItem from "./breadcrumbItem";

interface IBreadcrumb {
  paneId: string;
}

type Crumb = { id: string; type: PaneType; guid: string | null };

const NO_CRUMBS: Crumb[] = [];

const sameCrumbs = (a: Crumb[], b: Crumb[]) =>
  a.length === b.length &&
  a.every(
    (c, i) => c.id === b[i].id && c.type === b[i].type && c.guid === b[i].guid,
  );

export default function Breadcrumb({ paneId }: IBreadcrumb) {
  const select = useCallback(
    (s: UiState) => {
      const index = s.panes.findIndex((p) => p.id === paneId);
      return s.panes.slice(0, index + 1).map((p): Crumb => ({
        id: p.id,
        type: p.type,
        guid:
          p.type === "list"
            ? p.parentGuid
            : p.type === "detail"
              ? p.itemGuid
              : null,
      }));
    },
    [paneId],
  );

  const crumbs = useCachedSelector(select, sameCrumbs, NO_CRUMBS);

  return (
    <div className="w-full py-1 flex items-center gap-1 text-xs text-fg-muted overflow-hidden">
      {crumbs.map((c, i) => (
        <div key={c.id} className="flex items-center gap-1 min-w-0">
          {i !== 0 && <span className="text-fg-dim select-none">/</span>}
          <BreadcrumbItem
            type={c.type}
            guid={c.guid}
            isLast={i === crumbs.length - 1}
          />
        </div>
      ))}
    </div>
  );
}
