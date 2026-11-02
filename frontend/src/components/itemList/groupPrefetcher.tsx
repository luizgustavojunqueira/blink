import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { itemsQuery } from "../../hooks/useItems";
import { Group } from "../../types/backend";

export const PREFETCH_DELAY_MS = 150;

const selectSelectedGroup: PaneSelector<string | null> = (pane) =>
  pane?.type === "list" && pane.selectedGuid && pane.renderedTypes[pane.selectedGuid] === Group
    ? pane.selectedGuid
    : null;

export default function GroupPrefetcher({ paneId }: { paneId: string }) {
  const group = usePaneValue(paneId, selectSelectedGroup);
  const client = useQueryClient();

  useEffect(() => {
    if (!group) return;
    const timer = setTimeout(() => {
      void client.prefetchQuery(itemsQuery({ parent_id: group }));
    }, PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [group, client]);

  return null;
}
