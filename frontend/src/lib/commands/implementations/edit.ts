import { useUiStore } from "../../../stores/ui";
import {
  DESCRIPTION_MODIFIER,
  HELP_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
  TYPE_MODIFIER,
  DUE_MODIFIER,
} from "../../modifiers/delimiters";
import { singleDue } from "../../modifiers/implementations/due";
import { modifierOptions } from "../../modifiers/options";
import { parseModifiers } from "../../modifiers/parse";
import type { ItemPatch } from "../../types";
import type { CommandDefinition } from "../types";
import { only } from "./utils";
import { t } from "../../i18n";

const EDIT_MODIFIERS = [
  STATUS_MODIFIER,
  PRIORITY_MODIFIER,
  TAG_MODIFIER,
  DESCRIPTION_MODIFIER,
  DUE_MODIFIER,
  HELP_MODIFIER,
];

export const editCommand: CommandDefinition = {
  id: "edit",
  displayName: "edit",
  description: "Edit marked items, or the current one",
  strictArgPosition: false,
  when: ({ pane }) =>
    pane.type === "list" && (pane.markedGuids.size > 0 || pane.selectedGuid !== null),
  modifiers: EDIT_MODIFIERS,
  getOptions: modifierOptions(EDIT_MODIFIERS),
  execute: async ({ rawArgs, app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;

    const guids =
      pane.markedGuids.size > 0
        ? [...pane.markedGuids]
        : pane.selectedGuid
          ? [pane.selectedGuid]
          : [];
    if (guids.length === 0) return { message: t("Select or mark an item") };

    const result = parseEdit(rawArgs, guids.length);

    if (!result.ok) {
      return { message: result.error };
    }

    const updated = await app.items.bulkSetFields(guids, result.patch);

    if (updated.length === 0) {
      return { message: t("Nothing changed") };
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
      return { ok: false, error: t("Can't edit title of multiple items") };
    }

    if (description !== undefined) {
      return { ok: false, error: t("Can't edit description of multiple items") };
    }
  }

  if (values[TYPE_MODIFIER].length > 0 || invalid[TYPE_MODIFIER].length > 0) {
    return { ok: false, error: t("Can't edit type") };
  }

  const status = only(values[STATUS_MODIFIER], invalid[STATUS_MODIFIER], t("status"));
  if (!status.ok) return status;

  const priority = only(values[PRIORITY_MODIFIER], invalid[PRIORITY_MODIFIER], t("priority"));
  if (!priority.ok) return priority;

  const tags = values[TAG_MODIFIER];

  const due = singleDue(values[DUE_MODIFIER], invalid[DUE_MODIFIER]);
  if (!due.ok) return due;

  const patch: ItemPatch = {
    title: text || undefined,
    description,
    status: status.value,
    priority: priority.value,
    tags: tags.length > 0 ? tags : undefined,
    due_date: due.value,
  };

  if (Object.values(patch).every((value) => value === undefined)) {
    return { ok: false, error: t("Nothing to edit") };
  }

  return { ok: true, patch };
}
