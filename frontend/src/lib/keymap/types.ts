import type { Pane, PaneType } from "../pane/types";
import type { AppContext } from "../types";

export type Mode = "insert" | "normal";

export type KeyContext = {
  app: AppContext;
  pane: Pane;
};

export type KeyBinding = {
  id: string;
  keys: string[];
  modes: Mode[];
  scope: PaneType | "global";
  when?: (ctx: KeyContext) => boolean;
  run: (ctx: KeyContext) => void | boolean;
};
