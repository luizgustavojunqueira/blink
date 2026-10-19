import type { UiActions } from "../stores/ui";
import type { Config, ConfigActions } from "./config/store";
import type { ConfigRow } from "./config/rows";
import type {
  BulkUpdateItemRequest,
  CreateItemRequest,
  GetItemResponse,
  UpdateItemRequest,
} from "../types/backend";

export type ItemPatch = Omit<BulkUpdateItemRequest, "guids">;

export type AppContext = {
  ui: UiActions;
  setTheme: (theme: string) => void;
  config: ConfigActions & {
    get: () => Config;
    rows: () => ConfigRow[];
  };
  items: {
    findItem: (guid: string) => GetItemResponse | undefined;
    bulkSetFields: (guids: string[], patch: ItemPatch) => Promise<string[]>;
    setField: (guid: string, key: keyof UpdateItemRequest, value: string | string[]) => void;
    create: (req: CreateItemRequest) => Promise<GetItemResponse>;
    update: (req: UpdateItemRequest, signal?: AbortSignal) => Promise<GetItemResponse>;
  };
};
