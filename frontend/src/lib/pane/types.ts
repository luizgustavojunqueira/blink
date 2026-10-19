import type { GetItemRequest, GetItemResponse, ItemType } from "../../types/backend";

export type PaneType = "list" | "detail" | "config";

export type ListPane = {
  id: string;
  type: "list";
  prompt: string;
  parentGuid: string | null;
  selectedGuid: string | null;
  renderedGuids: string[];
  markedGuids: Set<string>;
  anchorGuid: string | null;
  renderedTypes: Record<string, ItemType>;
  filter: GetItemRequest;
};

export type DetailPane = {
  id: string;
  type: "detail";
  itemGuid: string;
  selectedField: DetailField | null;
};

export type ConfigPane = {
  id: string;
  type: "config";
  selectedRow: string | null;
};

export type Pane = ListPane | DetailPane | ConfigPane;

type EditableField = keyof Omit<GetItemResponse, "guid" | "type">;

export const DETAIL_FIELDS = [
  "title",
  "description",
  "tags",
  "status",
  "priority",
] as const satisfies readonly EditableField[];

export type DetailField = (typeof DETAIL_FIELDS)[number];
