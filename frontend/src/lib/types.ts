import type { UiActions } from "../stores/ui";
import type {
  BulkUpdateItemRequest,
  CreateItemRequest,
  GetItemResponse,
  ItemPriority,
  ItemStatus,
  UpdateItemRequest,
} from "../types/backend";

export type AppContext = {
  ui: UiActions;
  setTheme: (theme: string) => void;
  items: {
    findItem: (guid: string) => GetItemResponse | undefined;
    bulkSetField: (
      guids: string[],
      key: keyof Omit<BulkUpdateItemRequest, "guids">,
      value: string | string[] | ItemStatus | ItemPriority,
    ) => Promise<void> | undefined;
    setField: (
      guid: string,
      key: keyof UpdateItemRequest,
      value: string | string[] | ItemStatus | ItemPriority,
    ) => void;
    create: (req: CreateItemRequest) => Promise<GetItemResponse>;
    update: (req: UpdateItemRequest) => Promise<GetItemResponse>;
  };
};
