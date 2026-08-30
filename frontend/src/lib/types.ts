import type { UiActions, UiState } from "../stores/ui";
import type {
  CreateItemRequest,
  GetItemResponse,
  ItemPriority,
  ItemStatus,
  UpdateItemRequest,
} from "../types/backend";

export type AppContext = {
  ui: UiState & UiActions;
  setTheme: (theme: string) => void;
  items: {
    findItem: (guid: string) => GetItemResponse | undefined;
    setField: (
      guid: string,
      key: keyof UpdateItemRequest,
      value: string | string[] | ItemStatus | ItemPriority,
    ) => void;
    create: (req: CreateItemRequest) => Promise<GetItemResponse>;
    update: (req: UpdateItemRequest) => Promise<GetItemResponse>;
  };
};
