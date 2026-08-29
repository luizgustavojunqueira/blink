import type { GetItemRequest } from "../../types/backend";

export type PaneType = "list" | "detail";

export type ListPane = {
  id: string;
  type: "list";
  prompt: string;
  parentId: string | null;
  selectedId: string | null;
  renderedIds: string[];
  filter: GetItemRequest;
};

export type DetailPane = {
  id: string;
  type: "detail";
  parentId: string | null;
  prompt: string;
  itemId: string;
};

export type Pane = ListPane | DetailPane;