import type { ConfigPane, DetailPane, HistoryPane, ListPane, ProfilePane } from "./types";

export const createListPane = (id: string, parentGuid: string | null): ListPane => ({
  id,
  parentGuid,
  prompt: "",
  type: "list",
  filter: { parent_id: parentGuid ?? undefined },
  selectedGuid: null,
  renderedGuids: [],
  markedGuids: new Set(),
  anchorGuid: null,
  renderedTypes: {},
});

export const createRootPane = (): ListPane => createListPane("root", null);

export const createDetailPane = (id: string, itemGuid: string): DetailPane => ({
  id,
  type: "detail",
  itemGuid,
  selectedField: "title",
});

export const createConfigPane = (id: string, selectedRow: string | null = null): ConfigPane => ({
  id,
  type: "config",
  selectedRow,
});

export const createProfilePane = (id: string, selectedRow: string | null = null): ProfilePane => ({
  id,
  type: "profile",
  selectedRow,
});

export const createHistoryPane = (id: string, itemGuid: string): HistoryPane => ({
  id,
  type: "history",
  itemGuid,
  selectedRow: null,
});
