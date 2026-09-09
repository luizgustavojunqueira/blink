import type { GetItemRequest, GetItemResponse, ItemType } from "../../types/backend";

export type PaneType = "list" | "detail";

export type ListPane = {
  id: string;
  type: "list";
  prompt: string;
  parentId: string | null;
  selectedId: string | null;
  renderedIds: string[];
  markedIds: Set<string>;
  anchorGuid: string | null;
  renderedTypes: Record<string, ItemType>;
  filter: GetItemRequest;
};

export type DetailPane = {
  id: string;
  type: "detail";
  itemId: string;
  selectedField: DetailField | null;
};

export type Pane = ListPane | DetailPane;

type EditableField = keyof Omit<GetItemResponse, "guid" | "type">;

export const DETAIL_FIELDS = [
  "title",
  "description",
  "tags",
  "status",
  "priority",
] as const satisfies readonly EditableField[];

export type DetailField = (typeof DETAIL_FIELDS)[number];
