import type { KeyBinding } from "../types";

export const visualMode: KeyBinding[] = [
  {
    id: "visualMode",
    keys: ["v"],
    modes: ["normal", "visual"],
    scope: "list",
    description: "Toggle visual mode",
    when: ({ pane }) => pane.type === "list" && pane.selectedId !== null,
    run: ({ app, pane }) => {
      if (pane.type === "list" && pane.selectedId !== null) {
        app.ui.toggleVisual(pane.selectedId);
      }
    },
  },
];
