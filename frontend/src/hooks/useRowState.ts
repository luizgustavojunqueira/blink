import { useCallback, useSyncExternalStore } from "react";
import { useUiStore, type UiState } from "../stores/ui";
import type { ListPane } from "../lib/pane/types";

export const ROW_SELECTED = 1;
export const ROW_MARKED = 2;
export const ROW_IN_RANGE = 4;

const BULK_ROWS = 50;

type Listener = () => void;
type Rows = Map<string, Set<Listener>>;
type Range = [number, number] | null;

const listeners = new Map<string, Rows>();
const indexCache = new WeakMap<string[], Map<string, number>>();
let unsubscribeStore: (() => void) | null = null;
let notified = 0;
let bulkFrame = 0;

export function guidIndex(guids: string[], guid: string): number {
  let index = indexCache.get(guids);
  if (!index) {
    index = new Map(guids.map((g, i) => [g, i]));
    indexCache.set(guids, index);
  }
  return index.get(guid) ?? -1;
}

const findListPane = (s: UiState, paneId: string): ListPane | undefined => {
  const pane = s.panes.find((p) => p.id === paneId);
  return pane?.type === "list" ? pane : undefined;
};

export function visualRange(s: UiState, pane: ListPane | undefined): Range {
  if (s.mode !== "visual" || !pane?.anchorGuid || !pane.selectedGuid) return null;
  const a = guidIndex(pane.renderedGuids, pane.anchorGuid);
  const b = guidIndex(pane.renderedGuids, pane.selectedGuid);
  if (a === -1 || b === -1) return null;
  return a <= b ? [a, b] : [b, a];
}

export function rowState(s: UiState, paneId: string, guid: string): number {
  const pane = findListPane(s, paneId);
  if (!pane) return 0;

  let state = 0;
  if (pane.selectedGuid === guid) state |= ROW_SELECTED;
  if (pane.markedGuids.has(guid)) state |= ROW_MARKED;

  const range = visualRange(s, pane);
  if (range) {
    const i = guidIndex(pane.renderedGuids, guid);
    if (i >= range[0] && i <= range[1]) state |= ROW_IN_RANGE;
  }

  return state;
}

const notifySet = (set: Set<Listener> | undefined) => {
  if (!set) return;
  notified++;
  set.forEach((l) => l());
};

const notify = (rows: Rows, guid: string | null | undefined) => {
  if (guid) notifySet(rows.get(guid));
};

const notifyAll = (rows: Rows) => rows.forEach(notifySet);

const notifyIndexes = (rows: Rows, guids: string[], from: number, to: number) => {
  for (let i = from; i <= to; i++) notify(rows, guids[i]);
};

const notifyRangeDiff = (rows: Rows, guids: string[], a: Range, b: Range) => {
  if (!a) return;
  if (!b) return notifyIndexes(rows, guids, a[0], a[1]);
  notifyIndexes(rows, guids, a[0], Math.min(a[1], b[0] - 1));
  notifyIndexes(rows, guids, Math.max(a[0], b[1] + 1), a[1]);
};

function suppressTransitions() {
  const root = document.documentElement;
  root.dataset.bulk = "";
  cancelAnimationFrame(bulkFrame);
  bulkFrame = requestAnimationFrame(() => {
    bulkFrame = requestAnimationFrame(() => delete root.dataset.bulk);
  });
}

function onStoreChange(next: UiState, prev: UiState) {
  notified = 0;
  notifyPanes(next, prev);
  if (notified > BULK_ROWS) suppressTransitions();
}

function notifyPanes(next: UiState, prev: UiState) {
  for (const [paneId, rows] of listeners) {
    const after = findListPane(next, paneId);
    const before = findListPane(prev, paneId);

    if (after === before && next.mode === prev.mode) continue;
    if (!after || !before) {
      notifyAll(rows);
      continue;
    }

    if (after.selectedGuid !== before.selectedGuid) {
      notify(rows, before.selectedGuid);
      notify(rows, after.selectedGuid);
    }

    if (after.markedGuids !== before.markedGuids) {
      for (const g of before.markedGuids) if (!after.markedGuids.has(g)) notify(rows, g);
      for (const g of after.markedGuids) if (!before.markedGuids.has(g)) notify(rows, g);
    }

    const rangeBefore = visualRange(prev, before);
    const rangeAfter = visualRange(next, after);

    if (after.renderedGuids !== before.renderedGuids) {
      if (rangeBefore) notifyIndexes(rows, before.renderedGuids, rangeBefore[0], rangeBefore[1]);
      if (rangeAfter) notifyIndexes(rows, after.renderedGuids, rangeAfter[0], rangeAfter[1]);
      continue;
    }

    notifyRangeDiff(rows, after.renderedGuids, rangeBefore, rangeAfter);
    notifyRangeDiff(rows, after.renderedGuids, rangeAfter, rangeBefore);
  }
}

function subscribeRow(paneId: string, guid: string, listener: Listener) {
  let rows = listeners.get(paneId);
  if (!rows) listeners.set(paneId, (rows = new Map()));

  let set = rows.get(guid);
  if (!set) rows.set(guid, (set = new Set()));

  set.add(listener);
  unsubscribeStore ??= useUiStore.subscribe(onStoreChange);

  return () => {
    set.delete(listener);
    if (set.size === 0 && rows.get(guid) === set) rows.delete(guid);
    if (rows.size === 0 && listeners.get(paneId) === rows) listeners.delete(paneId);
    if (listeners.size === 0 && unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
  };
}

export function useRowState(paneId: string, guid: string): number {
  const subscribe = useCallback((l: Listener) => subscribeRow(paneId, guid, l), [paneId, guid]);
  const getSnapshot = useCallback(() => rowState(useUiStore.getState(), paneId, guid), [paneId, guid]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
