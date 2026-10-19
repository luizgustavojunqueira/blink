import type { KeyBinding } from "../types";

export const escapeBind: KeyBinding = {
  id: "escape",
  keys: ["escape"],
  modes: ["normal", "insert", "visual"],
  scope: "global",
  description: "Escape",
  fixed: true,
  run: (ctx) => {
    ctx.app.ui.escape();
  },
};
