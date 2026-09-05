import type { UiState } from "../../stores/ui";
import type { Pane, PaneType } from "../pane/types";
import type { AppContext } from "../types";

export type Mode = "insert" | "normal";

export type KeyContext = {
  app: AppContext;
  pane: Pane;
};

export type KeyQueryContext = {
  ui: UiState;
  pane: Pane;
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
