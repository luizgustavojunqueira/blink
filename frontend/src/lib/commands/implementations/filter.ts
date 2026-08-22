import type { GetItemRequest } from "../../../types/backend";
import {
  DESCRIPTION_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
} from "../../modifiers/delimiters";
import { modifierOptions } from "../../modifiers/options";
import { parseModifiers } from "../../modifiers/parse";
import type { CommandDefinition } from "../types";

export function parseFilter(raw: string): GetItemRequest {
  const { text, values } = parseModifiers(raw);

  const tags = values[TAG_MODIFIER];
  const status = values[STATUS_MODIFIER];
  const priority = values[PRIORITY_MODIFIER];

  return {
    title: text || undefined,
    description: values[DESCRIPTION_MODIFIER][0],
    tags: tags.length ? tags : undefined,
    priority: priority.length ? priority : undefined,
    status: status.length ? status : undefined,
  };
}

export const filterCommand: CommandDefinition = {
  id: "filter",
  displayName: "filter",
  description: "Filter items",
  strictArgPosition: false,
  getOptions: modifierOptions,
  execute: ({ rawArgs, app }) => {
    app.ui.setFilter(parseFilter(rawArgs));
  },
};
