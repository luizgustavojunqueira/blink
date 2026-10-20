import { removeSelection } from "../../removeSelection";
import type { KeyBinding } from "../types";

export const deleteBindings: KeyBinding[] = [
  {
    id: "delete",
    keys: ["d d"],
    modes: ["normal"],
    scope: "list",
    description: "Delete marked or selected",
    hint: { group: "item" },
    when: ({ pane }) =>
      pane.type === "list" && (pane.markedGuids.size > 0 || pane.selectedGuid !== null),
    run: ({ app, pane }) => {
      if (pane.type !== "list") return;
      void removeSelection(app, pane);
    },
  },
  {
    id: "undo",
    keys: ["u"],
    modes: ["normal"],
    scope: "list",
    description: "Undo delete",
    hint: { group: "item" },
    run: ({ app }) => {
      void app.items.undo();
    },
  },
];
