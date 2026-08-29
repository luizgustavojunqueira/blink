import { createListPane } from "../../pane/factories";
import type { KeyBinding } from "../types";

export const paneNavigation: KeyBinding[] = [
  {
    id: "list:l",
    keys: ["l", "arrowright"],
    modes: ["normal"],
    scope: "list",
    run: ({ app, pane }) => {
      if (pane.type !== "list" || !pane.selectedId) return;
      app.ui.pushPane(createListPane(crypto.randomUUID(), pane.selectedId));
    },
  },
  {
    id: "list:h",
    keys: ["h", "arrowleft"],
    modes: ["normal"],
    scope: "global",
    run: ({ app }) => {
      app.ui.popPane();
    },
  },

  {
    id: "list:ctrll",
    keys: ["ctrl+l", "ctrl+arrowright"],
    modes: ["normal"],
    scope: "global",
    run: ({ app }) => {
      app.ui.moveRight();
    },
  },
  {
    id: "list:ctrlh",
    keys: ["ctrl+h", "ctrl+arrowleft"],
    modes: ["normal"],
    scope: "global",
    run: ({ app }) => {
      app.ui.moveLeft();
    },
  },
];
