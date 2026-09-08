import { useUiStore } from "../../../stores/ui";
import { Group, type CreateItemRequest } from "../../../types/backend";
import { modifierOptions } from "../../modifiers/options";
import { queryClient } from "../../queryClient";
import type { CommandDefinition } from "../types";
import { parseCreate } from "./create";

export const groupCommand: CommandDefinition = {
  id: "group",
  displayName: "group",
  description: "Group items under new parent",
  strictArgPosition: false,
  getOptions: modifierOptions,
  execute: async ({ rawArgs, app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;

    if (pane.markedIds.size === 0) return { message: "Mark at least one item" };

    const result = parseCreate(rawArgs);

    if (!result.ok) {
      return { message: result.error };
    }

    const request: CreateItemRequest = {
      ...result.req,
      parent_guid: pane.parentId ?? undefined,
      type: Group,
    };

    try {
      const newParent = await app.items.create(request);
      if (!newParent) {
        return { message: "Failed to group items" };
      }
      await app.items.bulkSetField([...pane.markedIds], "parent_guid", newParent.guid);
      await queryClient.invalidateQueries({ queryKey: ["items"] });

      useUiStore.setState((s) => ({
        panes: s.panes.map((p) =>
          p.id === pane.id ? { ...p, markedIds: new Set(), selectedId: newParent.guid } : p,
        ),
      }));
    } catch (e) {
      return {
        message: e instanceof Error ? e.message : "Failed to create item",
      };
    }

    return { shouldClearPrompt: true };
  },
};
