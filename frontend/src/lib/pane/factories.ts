import type { ConfigPane, DetailPane, ListPane } from "./types";

export const createListPane = (id: string, parentId: string | null): ListPane => ({
  id,
  parentId,
  prompt: "",
  type: "list",
  filter: { parent_id: parentId ?? undefined },
  selectedId: null,
  renderedIds: [],
  markedIds: new Set(),
  anchorGuid: null,
  renderedTypes: {},
});

export const createRootPane = (): ListPane => createListPane("root", null);

export const createDetailPane = (id: string, itemId: string): DetailPane => ({
  id,
  type: "detail",
  itemId,
  selectedField: "title",
});

export const createConfigPane = (id: string, selectedRow: string | null = null): ConfigPane => ({
  id,
  type: "config",
  selectedRow,
});
