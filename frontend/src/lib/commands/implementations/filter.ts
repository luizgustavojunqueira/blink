import { useUiStore } from "../../../stores/ui";
import type { GetItemRequest } from "../../../types/backend";
import {
  DESCRIPTION_MODIFIER,
  HELP_MODIFIER,
  ORDER_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
  TYPE_MODIFIER,
  DUE_MODIFIER,
} from "../../modifiers/delimiters";
import { modifierOptions } from "../../modifiers/options";
import { parseModifiers } from "../../modifiers/parse";
import type { CommandDefinition } from "../types";

const FILTER_MODIFIERS = [
  STATUS_MODIFIER,
  PRIORITY_MODIFIER,
  TAG_MODIFIER,
  DESCRIPTION_MODIFIER,
  ORDER_MODIFIER,
  TYPE_MODIFIER,
  DUE_MODIFIER,
  HELP_MODIFIER,
];

export function parseFilter(raw: string): GetItemRequest {
  const { text, values } = parseModifiers(raw);

  const tags = values[TAG_MODIFIER];
  const status = values[STATUS_MODIFIER];
  const priority = values[PRIORITY_MODIFIER];
  const order = values[ORDER_MODIFIER];
  const type = values[TYPE_MODIFIER];
  const due = values[DUE_MODIFIER].find((d) => d !== "");

  return {
    title: text || undefined,
    description: values[DESCRIPTION_MODIFIER][0],
    tags: tags.length ? tags : undefined,
    priority: priority.length ? priority : undefined,
    status: status.length ? status : undefined,
    order: order.length ? order : undefined,
    type: type.length ? type : undefined,
    due_from: due,
    due_to: due,
  };
}

export { FILTER_MODIFIERS };

export const filterCommand: CommandDefinition = {
  id: "filter",
  displayName: "filter",
  description: "Filter items",
  strictArgPosition: false,
  when: ({ pane }) => pane.type === "list",
  modifiers: FILTER_MODIFIERS,
  getOptions: modifierOptions(FILTER_MODIFIERS),
  execute: ({ rawArgs, app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;
    app.ui.setFilter({
      ...parseFilter(rawArgs),
      parent_id: pane.parentGuid ?? undefined,
    });
  },
};
