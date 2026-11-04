import { useUiStore } from "../../../stores/ui";
import { InProgress, ToDo } from "../../../types/backend";
import { dueRange } from "../../dates/due";
import { modifierOptions } from "../../modifiers/options";
import type { CommandDefinition } from "../types";
import { FILTER_MODIFIERS, parseFilter } from "./filter";

type DueView = "today" | "week" | "month";

const DESCRIPTIONS: Record<DueView, string> = {
  today: "Open items due today or overdue, from every group",
  week: "Open items due by the end of this week, from every group",
  month: "Open items due by the end of this month, from every group",
};

const dueView = (view: DueView): CommandDefinition => ({
  id: view,
  displayName: view,
  description: DESCRIPTIONS[view],
  strictArgPosition: false,
  when: ({ pane }) => pane.type === "list",
  modifiers: FILTER_MODIFIERS,
  getOptions: modifierOptions(FILTER_MODIFIERS),
  execute: ({ rawArgs, app }) => {
    const state = useUiStore.getState();
    const pane = state.panes.find((p) => p.id === state.activePaneId);
    if (!pane || pane.type !== "list") return;

    const { due_from: _from, due_to: _to, ...filter } = parseFilter(rawArgs);
    app.ui.setFilter({
      ...filter,
      ...dueRange(view),
      recursive: true,
      status: filter.status ?? [ToDo, InProgress],
      order: filter.order ?? ["due", "priority"],
    });
  },
});

export const todayCommand = dueView("today");
export const weekCommand = dueView("week");
export const monthCommand = dueView("month");
