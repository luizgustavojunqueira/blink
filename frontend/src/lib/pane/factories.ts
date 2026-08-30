import type { DetailPane, ListPane } from "./types";

export const createListPane = (id: string, parentId: string | null): ListPane => ({
  id,
  parentId,
  prompt: "",
  type: "list",
  filter: {},
  selectedId: null,
  renderedIds: [],
});

export const createRootPane = (): ListPane => createListPane("root", null);

export const createDetailPane = (
  id: string,
  parentId: string | null,
  itemId: string,
): DetailPane => ({
  id,
  parentId,
  type: "detail",
  itemId,
  selectedField: "title",
});
