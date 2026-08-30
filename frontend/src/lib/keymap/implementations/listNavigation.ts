import type { KeyBinding } from "../types";

export const listNavigationBindings: KeyBinding[] = [
  {
    id: "list:down",
    keys: ["j", "arrowdown"],
    modes: ["normal"],
    scope: "list",
    description: "Move down",
    run: ({ app }) => {
      app.ui.moveDown(1);
      return true;
    },
  },
  {
    id: "list:up",
    keys: ["k", "arrowup"],
    modes: ["normal"],
    scope: "list",
    description: "Move up",
    run: ({ app }) => {
      app.ui.moveUp(1);
      return true;
    },
  },
  {
    id: "list:ctrldown",
    keys: ["ctrl+d", "ctrl+arrowdown"],
    modes: ["normal"],
    scope: "list",
    description: "Move 5 down",
    run: ({ app }) => {
      app.ui.moveDown(5);
      return true;
    },
  },
  {
    id: "list:ctrlup",
    keys: ["ctrl+u", "ctrl+arrowup"],
    modes: ["normal"],
    scope: "list",
    description: "Move 5 up",
    run: ({ app }) => {
      app.ui.moveUp(5);
      return true;
    },
  },
];
