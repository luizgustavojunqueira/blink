import { useUiStore } from "../../../stores/ui";
import { Normal, Task, ToDo, type CreateItemRequest } from "../../../types/backend";
import {
  DESCRIPTION_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
  TYPE_MODIFIER,
} from "../../modifiers/delimiters";
import { modifierOptions } from "../../modifiers/options";
import { parseModifiers } from "../../modifiers/parse";
import type { CommandDefinition } from "../types";
import { only } from "./utils";

export const createCommand: CommandDefinition = {
  id: "create",
  displayName: "create",
  description: "Create a new item",
  strictArgPosition: false,
  getOptions: modifierOptions,
  execute: async ({ rawArgs, app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;

    const result = parseCreate(rawArgs);

    if (!result.ok) {
      return { message: result.error };
    }

    result.req.parent_guid = pane.parentId ?? undefined;

    await app.items.create(result.req);

    return { shouldClearPrompt: true };
  },
};

type ParseCreateResult = { ok: true; req: CreateItemRequest } | { ok: false; error: string };

export function parseCreate(raw: string): ParseCreateResult {
  const { text, values, invalid } = parseModifiers(raw);

  if (text === "") {
    return { ok: false, error: "Title is required" };
  }

  const status = only(values[STATUS_MODIFIER], invalid[STATUS_MODIFIER], "status");
  if (!status.ok) return status;

  const priority = only(values[PRIORITY_MODIFIER], invalid[PRIORITY_MODIFIER], "priority");
  if (!priority.ok) return priority;

  const type = only(values[TYPE_MODIFIER], invalid[TYPE_MODIFIER], "type");
  if (!type.ok) return type;

  return {
    ok: true,
    req: {
      title: text,
      description: values[DESCRIPTION_MODIFIER][0],
      tags: values[TAG_MODIFIER],
      status: status.value ?? ToDo,
      priority: priority.value ?? Normal,
      type: type.value ?? Task,
    },
  };
}
