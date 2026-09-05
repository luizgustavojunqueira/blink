import { useCallback, useRef } from "react";
import { useUiStore, type UiState } from "../stores/ui";
import type { Pane, PaneType } from "../lib/pane/types";

export type PaneSelector<T> = (pane: Pane | undefined, ui: UiState) => T;

export function useCachedSelector<T>(
  select: (ui: UiState) => T,
  equals: (a: T, b: T) => boolean,
  initial: T,
): T {
  const prev = useRef<T>(initial);

  return useUiStore(
    useCallback(
      (s: UiState) => {
        const next = select(s);
        return equals(prev.current, next) ? prev.current : (prev.current = next);
      },
      [select, equals],
    ),
  );
}

export function usePaneValue<T>(paneId: string, select: PaneSelector<T>): T {
  return useUiStore(useCallback((s: UiState) => select(findPane(s, paneId), s), [paneId, select]));
}

const findPane = (s: UiState, paneId: string) => s.panes.find((p) => p.id === paneId);

export const paneIsActive: PaneSelector<boolean> = (pane, ui) => pane?.id === ui.activePaneId;

export const paneEditing: PaneSelector<boolean> = (pane, ui) =>
  pane?.id === ui.activePaneId && ui.mode === "insert";

export type VisiblePane = { id: string; type: PaneType };

const NO_PANES: VisiblePane[] = [];

const sameVisiblePanes = (a: VisiblePane[], b: VisiblePane[]) =>
  a.length === b.length && a.every((p, i) => p.id === b[i].id && p.type === b[i].type);

export function useVisiblePanes(count: number) {
  const select = useCallback(
    (s: UiState) => s.panes.slice(-count).map((p) => ({ id: p.id, type: p.type })),
    [count],
  );

  return useCachedSelector(select, sameVisiblePanes, NO_PANES);
}
