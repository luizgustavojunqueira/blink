import type { KeyBinding } from "../types";

export const markBindings: KeyBinding[] = [
  {
    id: "mark:toggle",
    keys: ["space"],
    modes: ["normal"],
    scope: "list",
    description: "Toggle marked",
    hint: { group: "item" },

    when: ({ pane }) => {
      return pane.type === "list";
    },
    run: ({ app, pane }) => {
      if (pane.type !== "list" || pane.selectedId === null) return;
      app.ui.toggleMarked(pane.id, pane.selectedId);
    },
  },
];
