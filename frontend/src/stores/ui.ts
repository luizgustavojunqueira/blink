import { newId } from "../lib/id";
import { create, type StateCreator } from "zustand";
import { Group, type GetItemRequest, type ItemType } from "../types/backend";
import {
  DETAIL_FIELDS,
  type DetailField,
  type ListPane,
  type Pane,
  type PaneType,
} from "../lib/pane/types";
import {
  createConfigPane,
  createProfilePane,
  createHistoryPane,
  createDetailPane,
  createListPane,
  createRootPane,
} from "../lib/pane/factories";
import type { Mode } from "../lib/keymap/types";
import { PROFILE_ACCOUNT_ROW_ID } from "../lib/profile/rows";

export type FieldState = { status: "saving" } | { status: "error"; message: string };

export type UiState = {
  mode: Mode;
  panes: Pane[];
  activePaneId: string;
  showHint: boolean;
  currentKeySeq: string;
  fieldStates: Record<string, FieldState>;
};

export type UiActions = {
  setPrompt: (prompt: string) => void;
  setFilter: (filter: GetItemRequest) => void;
  setMode: (mode: Mode) => void;
  select: (paneId: string, guid: string | null) => void;
  enterInsert: (seed?: string) => void;
  escape: () => void;
  setRendered: (
    paneId: string,
    renderedGuids: string[],
    renderedTypes: Record<string, ItemType>,
  ) => void;
  moveUp: (steps?: number, all?: boolean) => void;
  moveDown: (steps?: number, all?: boolean) => void;
  pushPane: (pane: Pane) => void;
  popPane: () => void;
  openChildPane: (itemGuid: string, paneType: PaneType) => void;
  moveRight: () => void;
  moveLeft: () => void;
  moveField: (dir: 1 | -1) => void;
  selectField: (paneId: string, selectedField: DetailField) => void;
  selectPane: (paneId: string, mode: Mode) => void;
  toggleHint: () => void;
  setCurrentKeySeq: (keySeq: string) => void;
  setFieldState: (key: string, state: FieldState | null) => void;
  toggleMarked: (paneId: string, itemGuid: string) => void;
  toggleVisual: (anchorGuid: string) => void;
  openConfig: (selectedRow?: string | null) => void;
  openProfile: () => void;
  openHistory: () => void;
  selectRow: (paneId: string, rowId: string) => void;
};

const findPane = (panes: Pane[], paneId: string) => panes.find((p) => p.id === paneId);

const hasUserFilter = (pane: ListPane) =>
  Object.entries(pane.filter).some(([key, value]) => key !== "parent_id" && value !== undefined);

const mapActivePane = (panes: Pane[], activePaneId: string, nextPane: Pane): Pane[] =>
  panes.map((p) => (p.id === activePaneId ? nextPane : p));

const clearPaneMarks = (panes: Pane[], paneId: string): Pane[] => {
  const pane = findPane(panes, paneId);
  if (!pane || pane.type !== "list" || (pane.markedGuids.size === 0 && pane.anchorGuid === null)) {
    return panes;
  }
  return panes.map((p) => (p.id === paneId ? { ...pane, markedGuids: new Set(), anchorGuid: null } : p));
};

const commitVisualSelection =(pane: ListPane, fallbackAnchor?: string | null) => {
  const anchor = pane.anchorGuid ?? fallbackAnchor ?? pane.selectedGuid;
  const markedGuids = new Set(pane.markedGuids);
  if (anchor && pane.selectedGuid) {
    const a = pane.renderedGuids.indexOf(anchor);
    const b = pane.renderedGuids.indexOf(pane.selectedGuid);
    if (a !== -1 && b !== -1) {
      const [start, end] = a <= b ? [a, b] : [b, a];
      for (let i = start; i <= end; i++) markedGuids.add(pane.renderedGuids[i]);
    }
  }
  return { anchorGuid: null, markedGuids };
};

const syncChild = (parent: Pane, child: Pane): Pane => {
  if (
    parent.type !== "list" ||
    child.type === "config" ||
    child.type === "profile" ||
    child.type === "history"
  )
    return child;

  const target = parent.selectedGuid;
  const targetType = target ? parent.renderedTypes[target] : undefined;

  if (targetType === Group) {
    if (child.type === "list" && child.parentGuid === target) return child;
    return createListPane(child.id, target);
  }

  if (child.type === "detail") {
    if (child.itemGuid === (target ?? "")) return child;
    return { ...child, itemGuid: target ?? "", selectedField: null };
  }

  return { ...createDetailPane(child.id, target ?? ""), selectedField: null };
};

const syncChildPanes = (prev: Pane[], next: Pane[]): Pane[] => {
  if (next.length <= 1) return next;

  const out: Pane[] = [next[0]];
  let changed = false;

  for (let i = 1; i < next.length; i++) {
    const parent = out[i - 1];
    const before = prev.find((p) => p.id === parent.id);

    const moved =
      parent.type === "list" && before?.type === "list" && before.selectedGuid !== parent.selectedGuid;

    const child = moved ? syncChild(parent, next[i]) : next[i];
    if (child !== next[i]) changed = true;

    out.push(child);

    if (child.type !== next[i].type) return out;
  }

  return changed ? out : next;
};

type UiStore = UiState & UiActions;

const withPaneSync =
  (config: StateCreator<UiStore>): StateCreator<UiStore> =>
  (set, get, api) =>
    config(
      (partial) => {
        const patch = typeof partial === "function" ? partial(get()) : partial;

        const prevActiveId = get().activePaneId;
        const focusLeft = !!patch.activePaneId && patch.activePaneId !== prevActiveId;

        if (!patch.panes && !focusLeft) {
          set(patch);
          return;
        }

        const nextPanes = patch.panes ?? get().panes;
        const panes = syncChildPanes(
          get().panes,
          focusLeft ? clearPaneMarks(nextPanes, prevActiveId) : nextPanes,
        );
        const activePaneId = patch.activePaneId ?? prevActiveId;
        const stillThere = panes.some((p) => p.id === activePaneId);

        set({
          ...patch,
          panes,
          activePaneId: stillThere || panes.length === 0 ? activePaneId : panes[panes.length - 1].id,
        });
      },
      get,
      api,
    );

const rootPane = createRootPane();

export const useUiStore = create<UiStore>(
  withPaneSync((set) => ({
    mode: "normal",
    panes: [rootPane],
    activePaneId: rootPane.id,
    showHint: true,
    currentKeySeq: "",
    fieldStates: {},

    setCurrentKeySeq: (keySeq: string) => set({ currentKeySeq: keySeq }),

    setFieldState: (key, state) =>
      set((s) => {
        if (!state) {
          if (!(key in s.fieldStates)) return {};
          const { [key]: _, ...rest } = s.fieldStates;
          return { fieldStates: rest };
        }
        return { fieldStates: { ...s.fieldStates, [key]: state } };
      }),

    toggleHint: () =>
      set((s) => {
        return { showHint: !s.showHint };
      }),

    setRendered: (paneId, newGuids, newTypes) =>
      set((s) => {
        const pane = findPane(s.panes, paneId);
        if (!pane || pane.type !== "list") return {};

        if (
          pane.renderedGuids.length === newGuids.length &&
          pane.renderedGuids.every(
            (guid, i) => guid === newGuids[i] && pane.renderedTypes[guid] === newTypes[guid],
          )
        ) {
          return {};
        }

        const nextPane: Pane = {
          ...pane,
          renderedGuids: newGuids,
          renderedTypes: newTypes,
          selectedGuid:
            pane.selectedGuid && !newGuids.includes(pane.selectedGuid)
              ? (newGuids[0] ?? null)
              : pane.selectedGuid,
        };

        return { panes: mapActivePane(s.panes, paneId, nextPane) };
      }),

    moveDown: (steps = 1, all = false) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane || pane.type !== "list" || pane.renderedGuids.length === 0) return {};

        if (all) {
          return {
            panes: mapActivePane(s.panes, s.activePaneId, {
              ...pane,
              selectedGuid: pane.renderedGuids[pane.renderedGuids.length - 1],
            }),
          };
        }

        let newIndex = 0;

        if (pane.selectedGuid) {
          const currentIndex = pane.renderedGuids.indexOf(pane.selectedGuid);
          if (currentIndex === -1) {
            newIndex = Math.max(0, Math.min(steps - 1, pane.renderedGuids.length - 1));
          } else {
            newIndex = Math.min(currentIndex + steps, pane.renderedGuids.length - 1);
          }
        } else {
          newIndex = Math.max(0, Math.min(steps - 1, pane.renderedGuids.length - 1));
        }

        if (pane.selectedGuid === pane.renderedGuids[newIndex]) return {};

        return {
          panes: mapActivePane(s.panes, s.activePaneId, {
            ...pane,
            selectedGuid: pane.renderedGuids[newIndex],
          }),
        };
      }),

    moveUp: (steps = 1, all = false) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane || pane.type !== "list" || pane.renderedGuids.length === 0) return {};
        if (all) {
          return {
            panes: mapActivePane(s.panes, s.activePaneId, {
              ...pane,
              selectedGuid: pane.renderedGuids[0],
            }),
          };
        }

        let newIndex = pane.renderedGuids.length - 1;

        if (pane.selectedGuid) {
          const currentIndex = pane.renderedGuids.indexOf(pane.selectedGuid);
          if (currentIndex === -1) {
            newIndex = Math.max(0, pane.renderedGuids.length - steps);
          } else {
            newIndex = Math.max(0, currentIndex - steps);
          }
        } else {
          newIndex = Math.max(0, pane.renderedGuids.length - steps);
        }

        if (pane.selectedGuid === pane.renderedGuids[newIndex]) return {};

        return {
          panes: mapActivePane(s.panes, s.activePaneId, {
            ...pane,
            selectedGuid: pane.renderedGuids[newIndex],
          }),
        };
      }),

    setPrompt: (prompt) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane || pane.type !== "list" || pane.prompt === prompt) return {};
        return {
          panes: mapActivePane(s.panes, s.activePaneId, { ...pane, prompt }),
        };
      }),

    setFilter: (filter) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane || pane.type !== "list") return {};
        return {
          panes: mapActivePane(s.panes, s.activePaneId, { ...pane, filter }),
        };
      }),

    select: (paneId, selectedGuid) =>
      set((s) => {
        const pane = findPane(s.panes, paneId);
        if (!pane || pane.type !== "list" || pane.selectedGuid === selectedGuid) return {};

        const isVisualInActivePane = s.mode === "visual" && s.activePaneId === paneId;

        return {
          activePaneId: paneId,
          mode: isVisualInActivePane ? "visual" : "normal",
          panes: mapActivePane(s.panes, paneId, { ...pane, selectedGuid }),
        };
      }),

    toggleMarked: (paneId, itemGuid) =>
      set((s) => {
        const pane = findPane(s.panes, paneId);
        if (!pane || pane.type !== "list") return {};

        const newSet = new Set(pane.markedGuids);
        if (newSet.has(itemGuid)) newSet.delete(itemGuid);
        else newSet.add(itemGuid);

        return {
          activePaneId: paneId,
          mode: "normal",
          panes: mapActivePane(s.panes, paneId, {
            ...pane,
            anchorGuid: null,
            markedGuids: newSet,
          }),
        };
      }),

    selectPane: (paneId, mode: Mode = "normal") =>
      set((s) => {
        const pane = findPane(s.panes, paneId);
        if (!pane) return {};

        return {
          activePaneId: paneId,
          mode: mode,
        };
      }),

    selectField: (paneId: string, selectedField: DetailField) =>
      set((s) => {
        const pane = findPane(s.panes, paneId);
        if (!pane || pane.type !== "detail" || pane.selectedField === selectedField) return {};
        return {
          activePaneId: paneId,
          panes: mapActivePane(s.panes, paneId, { ...pane, selectedField }),
        };
      }),

    setMode: (mode: Mode) => set({ mode }),

    toggleVisual: (anchorGuid) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane || pane.type !== "list") return {};

        const anchor = anchorGuid ?? pane.selectedGuid;
        if (!anchor) return {};

        const isEntering = s.mode === "normal";
        return {
          mode: isEntering ? "visual" : "normal",
          panes: mapActivePane(s.panes, s.activePaneId, {
            ...pane,
            ...(isEntering ? { anchorGuid: anchor } : commitVisualSelection(pane, anchor)),
          }),
        };
      }),

    enterInsert: (seed) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane) return {};
        if (pane.type !== "list") return { mode: "insert" };
        const prompt = seed === undefined ? pane.prompt : pane.prompt + seed;
        return {
          mode: "insert",
          panes: mapActivePane(s.panes, s.activePaneId, { ...pane, prompt }),
        };
      }),

    escape: () =>
      set((s) => {
        if (s.mode === "insert") return { mode: "normal" };

        if (s.mode === "visual") {
          const pane = findPane(s.panes, s.activePaneId);
          if (!pane || pane.type !== "list") return { mode: "normal" };

          return {
            mode: "normal",
            panes: mapActivePane(s.panes, s.activePaneId, {
              ...pane,
              ...commitVisualSelection(pane),
            }),
          };
        }

        const pane = findPane(s.panes, s.activePaneId);
        if (!pane) return {};

        if (pane.type === "list") {
          if (pane.prompt !== "" || hasUserFilter(pane)) {
            return {
              panes: mapActivePane(s.panes, s.activePaneId, {
                ...pane,
                prompt: "",
                filter: { parent_id: pane.parentGuid ?? undefined },
              }),
            };
          }

          if (pane.markedGuids.size !== 0) {
            return {
              panes: mapActivePane(s.panes, s.activePaneId, {
                ...pane,
                markedGuids: new Set(),
              }),
            };
          }
          if (pane.selectedGuid !== null) {
            return {
              panes: mapActivePane(s.panes, s.activePaneId, {
                ...pane,
                selectedGuid: null,
              }),
            };
          }
          return {};
        }

        if (s.panes.length <= 1) return {};
        const panes = s.panes.slice(0, -1);
        return { panes, activePaneId: panes[panes.length - 1].id };
      }),

    pushPane: (pane: Pane) =>
      set((s) => {
        const idx = s.panes.findIndex((p) => p.id === s.activePaneId);
        const panes = [...s.panes.slice(0, idx + 1), pane];
        return { panes, activePaneId: pane.id };
      }),

    popPane: () =>
      set((s) => {
        if (s.panes.length <= 1) return {};
        const panes = s.panes.slice(0, -1);
        return { panes, activePaneId: panes[panes.length - 1].id };
      }),

    openChildPane: (itemGuid, paneType) =>
      set((s) => {
        const idx = s.panes.findIndex((p) => p.id === s.activePaneId);
        if (idx === -1) return {};

        const child = s.panes[idx + 1];

        if (paneType === "detail") {
          if (child?.type === "detail") {
            if (child.itemGuid === itemGuid) return { activePaneId: child.id };
            return {
              panes: [...s.panes.slice(0, idx + 1), { ...child, itemGuid }],
              activePaneId: child.id,
            };
          }
          const pane = createDetailPane(newId(), itemGuid);
          return {
            panes: [...s.panes.slice(0, idx + 1), pane],
            activePaneId: pane.id,
          };
        } else if (paneType === "list") {
          const pane = createListPane(newId(), itemGuid);
          return {
            panes: [...s.panes.slice(0, idx + 1), pane],
            activePaneId: pane.id,
          };
        }

        return {};
      }),

    moveRight: () =>
      set((s) => {
        const lo = Math.max(0, s.panes.length - 2);
        const hi = s.panes.length - 1;
        const i = Math.min(
          Math.max(
            s.panes.findIndex((p) => p.id === s.activePaneId),
            lo,
          ),
          hi,
        );
        const next = s.panes[Math.min(i + 1, hi)];
        if (!next || next.id === s.activePaneId) return {};
        return { activePaneId: next.id };
      }),

    moveLeft: () =>
      set((s) => {
        const lo = Math.max(0, s.panes.length - 2);
        const hi = s.panes.length - 1;
        const i = Math.min(
          Math.max(
            s.panes.findIndex((p) => p.id === s.activePaneId),
            lo,
          ),
          hi,
        );
        const prev = s.panes[Math.max(i - 1, lo)];
        if (!prev || prev.id === s.activePaneId) return {};
        return { activePaneId: prev.id };
      }),

    openConfig: (selectedRow = null) =>
      set((s) => {
        const existing = s.panes.find((p) => p.type === "config");
        if (existing) return { activePaneId: existing.id };

        const idx = s.panes.findIndex((p) => p.id === s.activePaneId);
        const pane = createConfigPane(newId(), selectedRow);
        return { panes: [...s.panes.slice(0, idx + 1), pane], activePaneId: pane.id };
      }),

    openProfile: () =>
      set((s) => {
        const existing = s.panes.find((p) => p.type === "profile");
        if (existing) return { activePaneId: existing.id };

        const idx = s.panes.findIndex((p) => p.id === s.activePaneId);
        const pane = createProfilePane(newId(), PROFILE_ACCOUNT_ROW_ID);
        return { panes: [...s.panes.slice(0, idx + 1), pane], activePaneId: pane.id };
      }),

    openHistory: () =>
      set((s) => {
        const idx = s.panes.findIndex((p) => p.id === s.activePaneId);
        const active = s.panes[idx];
        const guid =
          active?.type === "list"
            ? active.selectedGuid
            : active?.type === "detail"
              ? active.itemGuid
              : null;
        if (!guid) return {};

        const child = s.panes[idx + 1];
        if (child?.type === "history" && child.itemGuid === guid) return { activePaneId: child.id };

        const pane = createHistoryPane(newId(), guid);
        return { panes: [...s.panes.slice(0, idx + 1), pane], activePaneId: pane.id };
      }),

    selectRow: (paneId, rowId) =>
      set((s) => {
        const pane = findPane(s.panes, paneId);
        if (!pane || (pane.type !== "config" && pane.type !== "profile" && pane.type !== "history"))
          return {};
        if (pane.selectedRow === rowId && s.activePaneId === paneId) return {};
        return {
          activePaneId: paneId,
          panes: mapActivePane(s.panes, paneId, { ...pane, selectedRow: rowId }),
        };
      }),

    moveField: (dir: 1 | -1) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane || pane.type !== "detail") return {};
        const idx = pane.selectedField ? DETAIL_FIELDS.indexOf(pane.selectedField) : -1;
        const next = Math.min(Math.max(idx + dir, 0), DETAIL_FIELDS.length - 1);
        return {
          panes: mapActivePane(s.panes, s.activePaneId, {
            ...pane,
            selectedField: DETAIL_FIELDS[next],
          }),
        };
      }),
  })),
);
