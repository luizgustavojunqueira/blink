import type { KeyBinding } from "../types";
import {
  Archived,
  Canceled,
  Done,
  High,
  InProgress,
  Low,
  Normal,
  ToDo,
  Urgent,
  type ItemPriority,
  type ItemStatus,
} from "../../../types/backend";
import { priorityMapper, statusMapper } from "../../../utils/status";

export const detailPageNavigation: KeyBinding[] = [
  {
    id: "detail:down",
    keys: ["j", "arrowdown"],
    modes: ["normal"],
    scope: "detail",
    hint: { group: "nav" },
    description: "Next field",
    when: ({ pane }) => {
      return pane.type === "detail";
    },
    run: ({ app, pane }) => {
      if (pane.type !== "detail") return;
      app.ui.moveField(1);
    },
  },
  {
    id: "detail:up",
    keys: ["k", "arrowup"],
    modes: ["normal"],
    scope: "detail",
    hint: { group: "nav" },
    description: "Previous field",
    when: ({ pane }) => {
      return pane.type === "detail";
    },
    run: ({ app, pane }) => {
      if (pane.type !== "detail") return;
      app.ui.moveField(-1);
    },
  },
];

const statusToKey = {
  [ToDo]: "1",
  [InProgress]: "2",
  [Done]: "3",
  [Canceled]: "4",
  [Archived]: "5",
};

const updateStatusBinds = (status: ItemStatus): KeyBinding => ({
  id: `detail:status:${status}`,
  keys: [statusToKey[status]],
  modes: ["normal"],
  scope: "detail",
  description: statusMapper[status],
  hint: {
    group: "item",
  },
  when: ({ pane }) => {
    return pane.type === "detail" && pane.selectedField === "status";
  },
  run: ({ app, pane }) => {
    if (pane.type !== "detail" || pane.selectedField !== "status") return;
    if (pane.itemId) app.items.setStatus(pane.itemId, status);
  },
});

export const detailStatusKeyBindings: KeyBinding[] = Object.keys(statusToKey).map((s) =>
  updateStatusBinds(s),
);

const priorityToKey = {
  [Low]: "1",
  [Normal]: "2",
  [High]: "3",
  [Urgent]: "4",
};

const updatePriorityBinds = (priority: ItemPriority): KeyBinding => ({
  id: `detail:priority:${priority}`,
  keys: [priorityToKey[priority]],
  modes: ["normal"],
  scope: "detail",
  description: priorityMapper[priority],
  hint: {
    group: "item",
  },
  when: ({ pane }) => {
    return pane.type === "detail" && pane.selectedField === "priority";
  },
  run: ({ app, pane }) => {
    if (pane.type !== "detail" || pane.selectedField !== "priority") return;
    if (pane.itemId) app.items.setPriority(pane.itemId, priority);
  },
});

export const detailPriorityKeyBindings: KeyBinding[] = Object.keys(priorityToKey).map((s) =>
  updatePriorityBinds(s),
);
