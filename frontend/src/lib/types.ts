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
    setStatus: (guid: string, status: ItemStatus) => void;
    setPriority: (guid: string, priority: ItemPriority) => void;
    create: (req: CreateItemRequest) => Promise<GetItemResponse>;
    update: (req: UpdateItemRequest) => Promise<GetItemResponse>;
  };
};
