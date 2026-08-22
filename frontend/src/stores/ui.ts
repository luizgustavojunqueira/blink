import { create } from "zustand";
import type { GetItemRequest } from "../types/backend";

type Mode = "insert" | "normal";

export type UiState = {
  mode: Mode;
  prompt: string;
  filter: GetItemRequest;
  selectedId: string | null;
  renderedIds: string[];
};

export type UiActions = {
  setPrompt: (prompt: string) => void;
  setFilter: (filter: GetItemRequest) => void;
  setMode: (mode: Mode) => void;
  select: (id: string | null) => void;
  enterInsert: (seed?: string) => void;
  escape: () => void;
  setRenderedIds: (renderedIds: string[]) => void;
  moveUp: (steps: number) => void;
  moveDown: (steps: number) => void;
};

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  mode: "normal",
  prompt: "",
  filter: {},
  selectedId: null,
  renderedIds: [],

  setRenderedIds: (newIds) =>
    set((s) => {
      if (
        s.renderedIds.length === newIds.length &&
        s.renderedIds.every((id, index) => id === newIds[index])
      ) {
        return {};
      }

      const newState: Partial<UiState> = { renderedIds: newIds };
      if (s.selectedId && !newIds.includes(s.selectedId)) {
        newState.selectedId = newIds.length > 0 ? newIds[0] : null;
      }

      return newState;
    }),

  moveDown: (steps = 1) =>
    set((s) => {
      if (s.renderedIds.length === 0) return {};

      let newIndex = 0;

      if (s.selectedId) {
        const currentIndex = s.renderedIds.indexOf(s.selectedId);
        if (currentIndex === -1) {
          newIndex = Math.max(0, Math.min(steps - 1, s.renderedIds.length - 1));
        } else {
          newIndex = Math.min(currentIndex + steps, s.renderedIds.length - 1);
        }
      } else {
        newIndex = Math.max(0, Math.min(steps - 1, s.renderedIds.length - 1));
      }

      if (s.selectedId === s.renderedIds[newIndex]) return {};

      return { selectedId: s.renderedIds[newIndex] };
    }),

  moveUp: (steps = 1) =>
    set((s) => {
      if (s.renderedIds.length === 0) return {};

      let newIndex = s.renderedIds.length - 1;

      if (s.selectedId) {
        const currentIndex = s.renderedIds.indexOf(s.selectedId);
        if (currentIndex === -1) {
          newIndex = Math.max(0, s.renderedIds.length - steps);
        } else {
          newIndex = Math.max(0, currentIndex - steps);
        }
      } else {
        newIndex = Math.max(0, s.renderedIds.length - steps);
      }

      if (s.selectedId === s.renderedIds[newIndex]) return {};

      return { selectedId: s.renderedIds[newIndex] };
    }),

  setPrompt: (prompt: string) => set({ prompt }),
  setFilter: (filter: GetItemRequest) => set({ filter }),
  select: (selectedId: string | null) => set({ selectedId }),
  setMode: (mode: Mode) => set({ mode }),

  enterInsert: (seed) => {
    set((s) => ({
      mode: "insert",
      prompt: seed === undefined ? s.prompt : s.prompt + seed,
    }));
  },

  escape: () => {
    const { mode, prompt, filter } = get();
    if (mode === "insert") return set({ mode: "normal" });
    if (prompt || Object.keys(filter).length) {
      return set({ prompt: "", filter: {} });
    }
    set({ selectedId: null });
  },
}));
