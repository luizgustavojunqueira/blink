import type { AppContext } from "../types";

export type Mode = "insert" | "normal";
export type Scope = "prompt" | "list";

export type KeyContext = {
  app: AppContext;
};

export type KeyBinding = {
  id: string;
  keys: string[];
  modes: Mode[];
  scope: Scope;
  when?: (ctx: KeyContext) => boolean;
  run: (ctx: KeyContext) => void | boolean;
};
