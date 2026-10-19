import { useUiStore } from "../../../stores/ui";
import { Group, type CreateItemRequest } from "../../../types/backend";
import {
  DESCRIPTION_MODIFIER,
  HELP_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
} from "../../modifiers/delimiters";
import { modifierOptions } from "../../modifiers/options";
import { queryClient } from "../../queryClient";
import type { CommandDefinition } from "../types";
import { parseCreate } from "./create";

const GROUP_MODIFIERS = [
  STATUS_MODIFIER,
  PRIORITY_MODIFIER,
  TAG_MODIFIER,
  DESCRIPTION_MODIFIER,
  HELP_MODIFIER,
];

export const groupCommand: CommandDefinition = {
  id: "group",
  displayName: "group",
  description: "Group marked items under new parent",
  strictArgPosition: false,
  when: ({ pane }) => pane.type === "list" && pane.markedGuids.size > 0,
  modifiers: GROUP_MODIFIERS,
  getOptions: modifierOptions(GROUP_MODIFIERS),
  execute: async ({ rawArgs, app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;

    if (pane.markedGuids.size === 0) return { message: "Mark at least one item" };

    const result = parseCreate(rawArgs);

    if (!result.ok) {
      return { message: result.error };
    }

    const request: CreateItemRequest = {
      ...result.req,
      parent_guid: pane.parentGuid ?? undefined,
      type: Group,
    };

    const newParent = await app.items.create(request);
    if (!newParent) {
      return { message: "Failed to group items" };
    }

    await app.items.bulkSetFields([...pane.markedGuids], { parent_guid: newParent.guid });
    await queryClient.invalidateQueries({ queryKey: ["items"] });

    useUiStore.setState((s) => ({
      panes: s.panes.map((p) =>
        p.id === pane.id ? { ...p, markedGuids: new Set(), selectedGuid: newParent.guid } : p,
      ),
    }));

    return { shouldClearPrompt: true };
  },
};
