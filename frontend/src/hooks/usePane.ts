import { useCallback, useMemo, useRef } from "react";
import { useUiStore } from "../stores/ui";
import type { DetailField, DetailPane, ListPane, Pane, PaneType } from "../lib/pane/types";
import type { GetItemRequest } from "../types/backend";

const EMPTY_FILTER: GetItemRequest = {};

const findListPane = (panes: Pane[], paneId: string) =>
  panes.find((p): p is ListPane => p.id === paneId && p.type === "list");

const findDetailPane = (panes: Pane[], paneId: string) =>
  panes.find((p): p is DetailPane => p.id === paneId && p.type === "detail");

function usePaneCore<N extends Pane>(
  paneId: string,
  narrow: (pane: Pane | undefined) => N | undefined,
) {
  const pane = useUiStore((s) => narrow(s.panes.find((p) => p.id === paneId)));
  const select = useUiStore((s) => s.select);
  const setRenderedIds = useUiStore((s) => s.setRenderedIds);
  const pushPane = useUiStore((s) => s.pushPane);
  const activePaneId = useUiStore((s) => s.activePaneId);
  const isActive = pane?.id === activePaneId;

  return useMemo(
    () => ({
      pane: pane!,
      pushPane,
      isActive,
      select: (id: string) => select(paneId, id),
      setRenderedIds: (ids: string[]) => setRenderedIds(paneId, ids),
    }),
    [pane, paneId, pushPane, isActive, select, setRenderedIds],
  );
}

export function usePane(paneId: string) {
  return usePaneCore(paneId, (p) => p);
}

export function useListPane(paneId: string) {
  return usePaneCore(paneId, (p) => (p?.type === "list" ? p : undefined));
}

export function useDetailPane(paneId: string) {
  return usePaneCore(paneId, (p) => (p?.type === "detail" ? p : undefined));
}

export function usePaneIsActive(paneId: string) {
  return useUiStore(useCallback((s) => s.activePaneId === paneId, [paneId]));
}

export function useListPanePrompt(paneId: string) {
  return useUiStore(useCallback((s) => findListPane(s.panes, paneId)?.prompt ?? "", [paneId]));
}

export function useListPaneFilter(paneId: string) {
  return useUiStore(
    useCallback((s) => findListPane(s.panes, paneId)?.filter ?? EMPTY_FILTER, [paneId]),
  );
}

export function useListPaneSelectedId(paneId: string) {
  return useUiStore(
    useCallback((s) => findListPane(s.panes, paneId)?.selectedId ?? null, [paneId]),
  );
}

export type VisiblePane = { id: string; type: PaneType };

const sameVisiblePanes = (a: VisiblePane[], b: VisiblePane[]) =>
  a.length === b.length && a.every((p, i) => p.id === b[i].id && p.type === b[i].type);

export function useVisiblePanes(count: number) {
  const prev = useRef<VisiblePane[]>([]);

  return useUiStore(
    useCallback(
      (s) => {
        const next = s.panes.slice(-count).map((p) => ({ id: p.id, type: p.type }));
        return sameVisiblePanes(prev.current, next) ? prev.current : (prev.current = next);
      },
      [count],
    ),
  );
}

export function useDetailPaneItemId(paneId: string) {
  return useUiStore(useCallback((s) => findDetailPane(s.panes, paneId)?.itemId ?? "", [paneId]));
}

export function useDetailFieldSelected(paneId: string, field: DetailField) {
  return useUiStore(
    useCallback(
      (s) => findDetailPane(s.panes, paneId)?.selectedField === field,
      [paneId, field],
    ),
  );
}

export function useDetailFieldEditing(paneId: string, field: DetailField) {
  return useUiStore(
    useCallback(
      (s) =>
        s.activePaneId === paneId &&
        s.mode === "insert" &&
        findDetailPane(s.panes, paneId)?.selectedField === field,
      [paneId, field],
    ),
  );
}

export function usePaneEditing(paneId: string) {
  return useUiStore(
    useCallback((s) => s.activePaneId === paneId && s.mode === "insert", [paneId]),
  );
}
