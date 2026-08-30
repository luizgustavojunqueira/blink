import type { KeyBinding } from "../types";

export const toggleHintBind: KeyBinding = {
  id: "toggleHint",
  keys: ["t"],
  modes: ["normal"],
  scope: "global",
  description: "Toggle hint",
  run: (ctx) => {
    ctx.app.ui.toggleHint();
  },
};
