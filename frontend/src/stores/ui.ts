import { create } from "zustand";
import type { GetItemRequest } from "../types/backend";
import { DETAIL_FIELDS, type DetailField, type Pane } from "../lib/pane/types";
import { createDetailPane, createRootPane } from "../lib/pane/factories";

type Mode = "insert" | "normal";

export type UiState = {
  mode: Mode;
  panes: Pane[];
  activePaneId: string;
};

export type UiActions = {
  setPrompt: (prompt: string) => void;
  setFilter: (filter: GetItemRequest) => void;
  setMode: (mode: Mode) => void;
  select: (paneId: string, id: string | null) => void;
  enterInsert: (seed?: string) => void;
  escape: () => void;
  setRenderedIds: (paneId: string, renderedIds: string[]) => void;
  moveUp: (steps: number) => void;
  moveDown: (steps: number) => void;
  pushPane: (pane: Pane) => void;
  popPane: () => void;
  openDetail: (itemId: string) => void;
  moveRight: () => void;
  moveLeft: () => void;
  moveField: (dir: 1 | -1) => void;
  selectField: (paneId: string, selectedField: DetailField) => void;
  selectPane: (paneId: string, mode: Mode) => void;
};

const findPane = (panes: Pane[], paneId: string) => panes.find((p) => p.id === paneId);

const mapActivePane = (panes: Pane[], activePaneId: string, nextPane: Pane): Pane[] =>
  panes.map((p) => (p.id === activePaneId ? nextPane : p));

const rootPane = createRootPane();

export const useUiStore = create<UiState & UiActions>((set) => ({
  mode: "normal",
  panes: [rootPane],
  activePaneId: rootPane.id,

  setRenderedIds: (paneId, newIds) =>
    set((s) => {
      const pane = findPane(s.panes, paneId);
      if (!pane || pane.type !== "list") return {};

      if (
        pane.renderedIds.length === newIds.length &&
        pane.renderedIds.every((id, i) => id === newIds[i])
      ) {
        return {};
      }

      const nextPane: Pane = {
        ...pane,
        renderedIds: newIds,
        selectedId:
          pane.selectedId && !newIds.includes(pane.selectedId)
            ? (newIds[0] ?? null)
            : pane.selectedId,
      };

      return { panes: mapActivePane(s.panes, paneId, nextPane) };
    }),

  moveDown: (steps = 1) =>
    set((s) => {
      const pane = findPane(s.panes, s.activePaneId);
      if (!pane || pane.type !== "list" || pane.renderedIds.length === 0) return {};

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

  moveUp: (steps = 1) =>
    set((s) => {
      const pane = findPane(s.panes, s.activePaneId);
      if (!pane || pane.type !== "list" || pane.renderedIds.length === 0) return {};

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
        if (pane.prompt !== "" || Object.keys(pane.filter).length > 0) {
          return {
            panes: mapActivePane(s.panes, s.activePaneId, {
              ...pane,
              prompt: "",
              filter: {},
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

  openDetail: (itemId) =>
    set((s) => {
      const idx = s.panes.findIndex((p) => p.id === s.activePaneId);
      const active = s.panes[idx];
      if (active && active.type === "detail") {
        return {
          panes: [...s.panes.slice(0, idx), { ...active, itemId }],
          activePaneId: active.id,
        };
      }
      const pane = createDetailPane(crypto.randomUUID(), active?.parentId ?? null, itemId);
      return {
        panes: [...s.panes.slice(0, idx + 1), pane],
        activePaneId: pane.id,
      };
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
}));
