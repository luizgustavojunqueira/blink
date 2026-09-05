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

    result.req.parent_id = pane.parentId ?? undefined;

    try {
      await app.items.create(result.req);
    } catch (e) {
      return {
        message: e instanceof Error ? e.message : "Failed to create item",
      };
    }

    return { shouldClearPrompt: true };
  },
};

type ParseCreateResult = { ok: true; req: CreateItemRequest } | { ok: false; error: string };

function only(
  values: string[],
  invalid: string[],
  label: string,
  fallback: string,
): { ok: true; value: string } | { ok: false; error: string } {
  if (invalid.length > 0) {
    return { ok: false, error: `Invalid ${label} "${invalid[0]}"` };
  }

  if (values.length > 1) {
    return { ok: false, error: `An item can only have one ${label}` };
  }

  return { ok: true, value: (values[0] ?? fallback).toUpperCase() };
}

export function parseCreate(raw: string): ParseCreateResult {
  const { text, values, invalid } = parseModifiers(raw);

  if (text === "") {
    return { ok: false, error: "Title is required" };
  }

  const status = only(values[STATUS_MODIFIER], invalid[STATUS_MODIFIER], "status", ToDo);
  if (!status.ok) return status;

  const priority = only(values[PRIORITY_MODIFIER], invalid[PRIORITY_MODIFIER], "priority", Normal);
  if (!priority.ok) return priority;

  const type = only(values[TYPE_MODIFIER], invalid[TYPE_MODIFIER], "type", Task);
  if (!type.ok) return type;

  return {
    ok: true,
    req: {
      title: text,
      description: values[DESCRIPTION_MODIFIER][0],
      tags: values[TAG_MODIFIER],
      status: status.value,
      priority: priority.value,
      type: type.value,
    },
  };
}
