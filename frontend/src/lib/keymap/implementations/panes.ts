import { createDetailPane } from "../../pane/factories";
import type { KeyBinding } from "../types";

export const paneNavigation: KeyBinding[] = [
  {
    id: "list:l",
    keys: ["l", "arrowright", "enter"],
    modes: ["normal"],
    scope: "list",
    description: "Enter details",
    hint: { group: "nav" },
    when: ({ pane }) => {
      return pane.type === "list" && pane.selectedId !== null && pane.selectedId !== undefined;
    },
    run: ({ app, pane }) => {
      if (pane.type !== "list" || !pane.selectedId) return;
      app.ui.pushPane(createDetailPane(crypto.randomUUID(), pane.selectedId, pane.selectedId));
    },
  },
  {
    id: "list:h",
    keys: ["h", "arrowleft"],
    modes: ["normal"],
    scope: "global",
    description: "Pop pane",
    hint: { group: "nav" },
    when: ({ ui }) => {
      return ui.panes.length > 1;
    },
    run: ({ app }) => {
      app.ui.popPane();
    },
  },
  {
    id: "list:ctrll",
    keys: ["ctrl+l", "ctrl+arrowright"],
    modes: ["normal"],
    scope: "global",
    description: "Right pane",
    hint: { group: "nav" },
    when: ({ ui }) => {
      const activePaneIdx = ui.panes.findIndex((p) => p.id == ui.activePaneId);
      return ui.panes.length > 1 && activePaneIdx % 2 == 0;
    },
    run: ({ app }) => {
      app.ui.moveRight();
    },
  },
  {
    id: "list:ctrlh",
    keys: ["ctrl+h", "ctrl+arrowleft"],
    modes: ["normal"],
    scope: "global",
    description: "Left pane",
    hint: { group: "nav" },
    when: ({ ui }) => {
      const activePaneIdx = ui.panes.findIndex((p) => p.id == ui.activePaneId);
      return ui.panes.length > 1 && activePaneIdx % 2 == 1;
    },
    run: ({ app }) => {
      app.ui.moveLeft();
    },
  },
];
