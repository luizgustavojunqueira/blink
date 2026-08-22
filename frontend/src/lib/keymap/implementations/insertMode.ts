import type { KeyBinding } from "../types";

const prefixBind = (key: string): KeyBinding => ({
  id: `insert:${key}`,
  keys: [key],
  modes: ["normal"],
  scope: "list",
  run: ({ app }) => app.ui.enterInsert(key),
});

const insertModeBind: KeyBinding = {
  id: "insertMode",
  keys: ["i"],
  modes: ["normal"],
  scope: "list",
  run: ({ app }) => app.ui.enterInsert(),
};

export const prefixKeyBindings: KeyBinding[] = [
  insertModeBind,
  prefixBind("#"),
  prefixBind("!"),
  prefixBind("@"),
  prefixBind(":"),
  prefixBind("/"),
];
