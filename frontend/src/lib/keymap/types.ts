import type { UiState } from "../../stores/ui";
import type { ItemType } from "../../types/backend";
import type { Pane, PaneType } from "../pane/types";
import type { AppContext } from "../types";

export type Mode = "insert" | "normal" | "visual";

export type KeyContext = {
  app: AppContext;
  pane: Pane;
  itemType?: ItemType;
};

export type KeyQueryContext = {
  ui: UiState;
  pane: Pane;
  itemType?: ItemType;
};

export type KeyBinding = {
  id: string;
  keys: string[];
  modes: Mode[];
  scope: PaneType | "global";
  description: string;
  hint?: { group: "nav" | "item" | "pane" | "prompt"; primary?: boolean };
  when?: (ctx: KeyQueryContext) => boolean;
  run: (ctx: KeyContext, key?: string) => void | boolean;
};
