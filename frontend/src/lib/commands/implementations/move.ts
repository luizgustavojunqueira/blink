import { useUiStore } from "../../../stores/ui";
import { groupsQuery } from "../../../hooks/useItems";
import type { GetItemResponse } from "../../../types/backend";
import { blockedGroups, groupPaths, resolveGroup } from "../../moveTargets";
import { toPromptOption } from "../../promptOptions";
import { queryClient } from "../../queryClient";
import { leavePane, targetGuids } from "../../removeSelection";
import type { CommandDefinition } from "../types";

type MoveOptions = { groups: GetItemResponse[] };

const activeList = () => {
  const state = useUiStore.getState();
  const pane = state.panes.find((p) => p.id === state.activePaneId);
  return pane?.type === "list" ? pane : undefined;
};

export const moveCommand: CommandDefinition<MoveOptions> = {
  id: "move",
  displayName: "move",
  description: "Move marked items, or the current one, into a group",
  argCount: 1,
  when: ({ pane }) =>
    pane.type === "list" && (pane.markedGuids.size > 0 || pane.selectedGuid !== null),
  getOptions: (rawArgs, options) => {
    const pane = activeList();
    if (!pane || !options) return [];

    const filter = rawArgs.trim().toLowerCase();
    const blocked = blockedGroups(options.groups, targetGuids(pane));

    return groupPaths(options.groups)
      .filter((t) => !blocked.has(t.guid) && t.path.toLowerCase().includes(filter))
      .map((t) =>
        toPromptOption("COMMAND_ARG", {
          name: t.path,
          description: `Move into ${t.path}`,
          value: t.path,
        }),
      );
  },
  execute: async ({ rawArgs, app }) => {
    const pane = activeList();
    if (!pane) return;

    const guids = targetGuids(pane);
    if (guids.length === 0) return { message: "Select or mark an item" };
    if (rawArgs.trim() === "") return { message: "Type the group to move into" };

    const groups = await queryClient.fetchQuery(groupsQuery());
    const target = resolveGroup(groups, guids, rawArgs);
    if (!target.ok) return { message: target.error };

    try {
      await app.items.bulkSetFields(guids, { parent_guid: target.guid });
    } catch (err) {
      return { message: err instanceof Error ? err.message : "Move failed" };
    }

    leavePane(app, pane, guids);
    await queryClient.invalidateQueries({ queryKey: ["items"] });

    return { shouldClearPrompt: true };
  },
};
