import type { UiActions, UiState } from "../stores/ui";
import type {
  CreateItemRequest,
  GetItemResponse,
  ItemStatus,
  UpdateItemRequest,
} from "../types/backend";

export type AppContext = {
  ui: UiState & UiActions;
  setTheme: (theme: string) => void;
  items: {
    setStatus: (guid: string, status: ItemStatus) => void;
    create: (req: CreateItemRequest) => Promise<GetItemResponse>;
    update: (req: UpdateItemRequest) => Promise<GetItemResponse>;
  };
};
