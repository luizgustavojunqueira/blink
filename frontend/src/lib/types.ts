import type { UiActions, UiState } from "../stores/ui";
import type { CreateItemRequest, GetItemResponse } from "../types/backend";

export type AppContext = {
  ui: UiState & UiActions;
  setTheme: (theme: string) => void;
  items: {
    create: (req: CreateItemRequest) => Promise<GetItemResponse>;
  };
};
