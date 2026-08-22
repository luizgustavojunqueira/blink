import type { KeyBinding } from "../types";

export const escapeBind: KeyBinding = {
  id: "escape",
  keys: ["escape"],
  modes: ["normal", "insert"],
  scope: "list",
  run: (ctx) => {
    ctx.app.ui.escape();
  },
};
