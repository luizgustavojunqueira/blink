import { create, type StateCreator } from "zustand";
import { Group, Task, type GetItemRequest, type ItemType } from "../types/backend";
import {
  DETAIL_FIELDS,
  type DetailField,
  type ListPane,
  type Pane,
  type PaneType,
} from "../lib/pane/types";
import { createDetailPane, createListPane, createRootPane } from "../lib/pane/factories";

type Mode = "insert" | "normal";

export type UiState = {
  mode: Mode;
  panes: Pane[];
  activePaneId: string;
  showHint: boolean;
};

export type UiActions = {
  setPrompt: (prompt: string) => void;
  setFilter: (filter: GetItemRequest) => void;
  setMode: (mode: Mode) => void;
  select: (paneId: string, id: string | null) => void;
  enterInsert: (seed?: string) => void;
  escape: () => void;
  setRendered: (
    paneId: string,
    renderedIds: string[],
    renderedTypes: Record<string, ItemType>,
  ) => void;
  moveUp: (steps?: number, all?: boolean) => void;
  moveDown: (steps?: number, all?: boolean) => void;
  pushPane: (pane: Pane) => void;
  popPane: () => void;
  openChildPane: (itemId: string, paneType: PaneType) => void;
  moveRight: () => void;
  moveLeft: () => void;
  moveField: (dir: 1 | -1) => void;
  selectField: (paneId: string, selectedField: DetailField) => void;
  selectPane: (paneId: string, mode: Mode) => void;
  toggleHint: () => void;
};

const findPane = (panes: Pane[], paneId: string) => panes.find((p) => p.id === paneId);

const hasUserFilter = (pane: ListPane) =>
  Object.entries(pane.filter).some(([key, value]) => key !== "parent_id" && value !== undefined);

const mapActivePane = (panes: Pane[], activePaneId: string, nextPane: Pane): Pane[] =>
  panes.map((p) => (p.id === activePaneId ? nextPane : p));

const syncChild = (parent: Pane, child: Pane): Pane => {
  if (parent.type !== "list") return child;

  const target = parent.selectedId;
  const targetType = target ? parent.renderedTypes[target] : undefined;

  if (targetType === Group) {
    if (child.type === "list" && child.parentId === target) return child;
    return createListPane(child.id, target);
  }

  if (child.type === "detail") {
    if (child.itemId === (target ?? "")) return child;
    return { ...child, itemId: target ?? "", selectedField: null };
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
      parent.type === "list" && before?.type === "list" && before.selectedId !== parent.selectedId;

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
      (partial, replace) => {
        const patch = typeof partial === "function" ? partial(get()) : partial;

        if (!patch || !("panes" in patch) || !patch.panes) {
          set(patch as UiStore, replace as true);
          return;
        }

        const panes = syncChildPanes(get().panes, patch.panes);
        const activePaneId = patch.activePaneId ?? get().activePaneId;
        const stillThere = panes.some((p) => p.id === activePaneId);

        set(
          {
            ...patch,
            panes,
            activePaneId:
              stillThere || panes.length === 0 ? activePaneId : panes[panes.length - 1].id,
          } as UiStore,
          replace as true,
        );
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

    toggleHint: () =>
      set((s) => {
        return { showHint: !s.showHint };
      }),

    setRendered: (paneId, newIds, newTypes) =>
      set((s) => {
        const pane = findPane(s.panes, paneId);
        if (!pane || pane.type !== "list") return {};

        if (
          pane.renderedIds.length === newIds.length &&
          pane.renderedIds.every(
            (id, i) => id === newIds[i] && pane.renderedTypes[id] === newTypes[id],
          )
        ) {
          return {};
        }

        const nextPane: Pane = {
          ...pane,
          renderedIds: newIds,
          renderedTypes: newTypes,
          selectedId:
            pane.selectedId && !newIds.includes(pane.selectedId)
              ? (newIds[0] ?? null)
              : pane.selectedId,
        };

        return { panes: mapActivePane(s.panes, paneId, nextPane) };
      }),

    moveDown: (steps = 1, all = false) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane || pane.type !== "list" || pane.renderedIds.length === 0) return {};

        if (all) {
          return {
            panes: mapActivePane(s.panes, s.activePaneId, {
              ...pane,
              selectedId: pane.renderedIds[pane.renderedIds.length - 1],
            }),
          };
        }

        let newIndex = 0;

        if (pane.selectedId) {
          const currentIndex = pane.renderedIds.indexOf(pane.selectedId);
          if (currentIndex === -1) {
            newIndex = Math.max(0, Math.min(steps - 1, pane.renderedIds.length - 1));
          } else {
            newIndex = Math.min(currentIndex + steps, pane.renderedIds.length - 1);
          }
        } else {
          newIndex = Math.max(0, Math.min(steps - 1, pane.renderedIds.length - 1));
        }

        if (pane.selectedId === pane.renderedIds[newIndex]) return {};

        return {
          panes: mapActivePane(s.panes, s.activePaneId, {
            ...pane,
            selectedId: pane.renderedIds[newIndex],
          }),
        };
      }),

    moveUp: (steps = 1, all = false) =>
      set((s) => {
        const pane = findPane(s.panes, s.activePaneId);
        if (!pane || pane.type !== "list" || pane.renderedIds.length === 0) return {};
        if (all) {
          return {
            panes: mapActivePane(s.panes, s.activePaneId, {
              ...pane,
              selectedId: pane.renderedIds[0],
            }),
          };
        }

        let newIndex = pane.renderedIds.length - 1;

        if (pane.selectedId) {
          const currentIndex = pane.renderedIds.indexOf(pane.selectedId);
          if (currentIndex === -1) {
            newIndex = Math.max(0, pane.renderedIds.length - steps);
          } else {
            newIndex = Math.max(0, currentIndex - steps);
          }
        } else {
          newIndex = Math.max(0, pane.renderedIds.length - steps);
        }

        if (pane.selectedId === pane.renderedIds[newIndex]) return {};

        return {
          panes: mapActivePane(s.panes, s.activePaneId, {
            ...pane,
            selectedId: pane.renderedIds[newIndex],
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

    select: (paneId, selectedId) =>
      set((s) => {
        const pane = findPane(s.panes, paneId);
        if (!pane || pane.type !== "list" || pane.selectedId === selectedId) return {};

        return {
          activePaneId: paneId,
          mode: "normal",
          panes: mapActivePane(s.panes, paneId, { ...pane, selectedId }),
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

        const pane = findPane(s.panes, s.activePaneId);
        if (!pane) return {};

        if (pane.type === "list") {
          if (pane.prompt !== "" || hasUserFilter(pane)) {
            return {
              panes: mapActivePane(s.panes, s.activePaneId, {
                ...pane,
                prompt: "",
                filter: { parent_id: pane.parentId ?? undefined },
              }),
            };
          }
          if (pane.selectedId !== null) {
            return {
              panes: mapActivePane(s.panes, s.activePaneId, {
                ...pane,
                selectedId: null,
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

    openChildPane: (itemId, paneType) =>
      set((s) => {
        const idx = s.panes.findIndex((p) => p.id === s.activePaneId);
        if (idx === -1) return {};

        const child = s.panes[idx + 1];

        if (paneType === "detail") {
          if (child?.type === "detail") {
            if (child.itemId === itemId) return { activePaneId: child.id };
            return {
              panes: [...s.panes.slice(0, idx + 1), { ...child, itemId }],
              activePaneId: child.id,
            };
          }
          const pane = createDetailPane(crypto.randomUUID(), itemId);
          return {
            panes: [...s.panes.slice(0, idx + 1), pane],
            activePaneId: pane.id,
          };
        } else if (paneType === "list") {
          const pane = createListPane(crypto.randomUUID(), itemId);
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
