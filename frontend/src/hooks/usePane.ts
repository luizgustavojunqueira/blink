import { useMemo } from "react";
import { useUiStore } from "../stores/ui";
import type { Pane } from "../lib/pane/types";

function usePaneCore<N extends Pane>(
  paneId: string,
  narrow: (pane: Pane | undefined) => N | undefined,
) {
  const pane = useUiStore((s) => narrow(s.panes.find((p) => p.id === paneId)));
  const select = useUiStore((s) => s.select);
  const setRenderedIds = useUiStore((s) => s.setRenderedIds);
  const activePaneId = useUiStore((s) => s.activePaneId);
  const isActive = pane?.id === activePaneId;

  return useMemo(
    () => ({
      pane: pane!,
      isActive,
      select: (id: string) => select(paneId, id),
      setRenderedIds: (ids: string[]) => setRenderedIds(paneId, ids),
    }),
    [pane, paneId, isActive, select, setRenderedIds],
  );
}

export function usePane(paneId: string) {
  return usePaneCore(paneId, (p) => p);
}

export function useListPane(paneId: string) {
  return usePaneCore(paneId, (p) => (p?.type === "list" ? p : undefined));
}
