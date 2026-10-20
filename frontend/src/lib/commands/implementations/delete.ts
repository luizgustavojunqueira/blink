import { useUiStore } from "../../../stores/ui";
import { removeSelection } from "../../removeSelection";
import type { CommandDefinition } from "../types";

export const deleteCommand: CommandDefinition = {
  id: "delete",
  displayName: "delete",
  description: "Delete marked items, or the current one",
  when: ({ pane }) =>
    pane.type === "list" && (pane.markedGuids.size > 0 || pane.selectedGuid !== null),
  execute: async ({ app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;

    const error = await removeSelection(app, pane);
    if (error) return { message: error };

    return { shouldClearPrompt: true };
  },
};
