import { useUiStore } from "../../../stores/ui";
import { Archived, Done } from "../../../types/backend";
import type { CommandDefinition } from "../types";

export const archiveCommand: CommandDefinition = {
  id: "archive",
  displayName: "archive",
  description: "Archive done items among the marked, or the whole list",
  when: ({ pane }) => pane.type === "list",
  execute: async ({ app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;

    const scope = pane.markedGuids.size > 0 ? [...pane.markedGuids] : pane.renderedGuids;
    const done = scope.filter((guid) => app.items.findItem(guid)?.status === Done);
    if (done.length === 0) return { message: "No done items to archive" };

    try {
      await app.items.bulkSetFields(done, { status: Archived });
    } catch (err) {
      return { message: err instanceof Error ? err.message : "Archive failed" };
    }

    return { shouldClearPrompt: true };
  },
};
