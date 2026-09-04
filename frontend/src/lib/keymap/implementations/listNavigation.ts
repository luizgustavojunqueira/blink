import type { KeyBinding } from "../types";

export const listNavigationBindings: KeyBinding[] = [
  {
    id: "list:top",
    keys: ["g g"],
    modes: ["normal"],
    scope: "list",
    description: "Move to top",
    hint: { group: "nav" },
    run: ({ app }) => {
      app.ui.moveUp(undefined, true);
      return true;
    },
  },
  {
    id: "list:bottom",
    keys: ["G"],
    modes: ["normal"],
    scope: "list",
    description: "Move to bottom",
    hint: { group: "nav" },
    run: ({ app }) => {
      app.ui.moveDown(undefined, true);
      return true;
    },
  },
  {
    id: "list:down",
    keys: ["j", "arrowdown"],
    modes: ["normal"],
    scope: "list",
    description: "Move down",
    hint: { group: "nav" },
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
    hint: { group: "nav" },
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
    hint: { group: "nav" },
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
    hint: { group: "nav" },
    run: ({ app }) => {
      app.ui.moveUp(5);
      return true;
    },
  },
];
