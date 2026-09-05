import { Group, Task } from "../../../types/backend";
import type { KeyBinding } from "../types";

export const paneNavigation: KeyBinding[] = [
  {
    id: "list:l:group",
    keys: ["l", "arrowright"],
    modes: ["normal"],
    scope: "list",
    description: "Enter group",
    hint: { group: "nav" },
    when: ({ pane, itemType }) => {
      return (
        pane.type === "list" &&
        pane.selectedId !== null &&
        pane.selectedId !== undefined &&
        itemType === Group
      );
    },
    run: ({ app, pane, itemType }) => {
      if (pane.type !== "list" || !pane.selectedId) return;
      if (!itemType || itemType !== Group) return;
      app.ui.openChildPane(pane.selectedId, "list");
    },
  },
  {
    id: "list:l:detail",
    keys: ["l", "arrowright", "enter"],
    modes: ["normal"],
    scope: "list",
    description: "Enter details",
    hint: { group: "nav" },
    when: ({ pane, itemType }) => {
      return (
        pane.type === "list" &&
        pane.selectedId !== null &&
        pane.selectedId !== undefined &&
        itemType === Task
      );
    },
    run: ({ app, pane, itemType }) => {
      if (pane.type !== "list" || !pane.selectedId) return;
      if (!itemType || itemType !== Task) return;
      app.ui.openChildPane(pane.selectedId, "detail");
    },
  },
  {
    id: "list:enter",
    keys: ["enter"],
    modes: ["normal"],
    scope: "list",
    description: "Enter details",
    hint: { group: "nav" },
    when: ({ pane, itemType }) => {
      return (
        pane.type === "list" &&
        pane.selectedId !== null &&
        pane.selectedId !== undefined &&
        itemType === Group
      );
    },
    run: ({ app, pane, itemType }) => {
      if (pane.type !== "list" || !pane.selectedId || itemType !== Group) return;

      app.ui.openChildPane(pane.selectedId, "detail");
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
      return activePaneIdx >= 0 && activePaneIdx < ui.panes.length - 1;
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
      return ui.panes.length > 1 && activePaneIdx > Math.max(0, ui.panes.length - 2);
    },
    run: ({ app }) => {
      app.ui.moveLeft();
    },
  },
];
