import { useUiStore } from "../../../stores/ui";
import {
  DESCRIPTION_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
  TYPE_MODIFIER,
} from "../../modifiers/delimiters";
import { modifierOptions } from "../../modifiers/options";
import { parseModifiers } from "../../modifiers/parse";
import type { ItemPatch } from "../../types";
import type { CommandDefinition } from "../types";
import { only } from "./utils";

export const editCommand: CommandDefinition = {
  id: "edit",
  displayName: "edit",
  description: "Edit marked items",
  strictArgPosition: false,
  getOptions: modifierOptions,
  execute: async ({ rawArgs, app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;

    const guids = [...pane.markedIds];
    if (guids.length === 0) return { message: "Mark at least one item" };

    const result = parseEdit(rawArgs, guids.length);

    if (!result.ok) {
      return { message: result.error };
    }

    const updated = await app.items.bulkSetFields(guids, result.patch);

    if (updated.length === 0) {
      return { message: "Nothing changed" };
    }

    return { shouldClearPrompt: true };
  },
};

type ParseEditResult = { ok: true; patch: ItemPatch } | { ok: false; error: string };

export function parseEdit(raw: string, numItems: number): ParseEditResult {
  const { text, values, invalid } = parseModifiers(raw);

  const description = values[DESCRIPTION_MODIFIER][0];

  if (numItems > 1) {
    if (text !== "") {
      return { ok: false, error: "Can't edit title of multiple items" };
    }

    if (description !== undefined) {
      return { ok: false, error: "Can't edit description of multiple items" };
    }
  }

  if (values[TYPE_MODIFIER].length > 0 || invalid[TYPE_MODIFIER].length > 0) {
    return { ok: false, error: "Can't edit type" };
  }

  const status = only(values[STATUS_MODIFIER], invalid[STATUS_MODIFIER], "status");
  if (!status.ok) return status;

  const priority = only(values[PRIORITY_MODIFIER], invalid[PRIORITY_MODIFIER], "priority");
  if (!priority.ok) return priority;

  const tags = values[TAG_MODIFIER];

  const patch: ItemPatch = {
    title: text || undefined,
    description,
    status: status.value,
    priority: priority.value,
    tags: tags.length > 0 ? tags : undefined,
  };

  if (Object.values(patch).every((value) => value === undefined)) {
    return { ok: false, error: "Nothing to edit" };
  }

  return { ok: true, patch };
}
