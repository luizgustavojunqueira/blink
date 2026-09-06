import {
  Archived,
  Canceled,
  Done,
  InProgress,
  ToDo,
  type ItemStatus,
} from "../../../types/backend";
import { statusMapper } from "../../../utils/status";
import type { KeyBinding } from "../types";

const statusToKey = {
  [ToDo]: "1",
  [InProgress]: "2",
  [Done]: "3",
  [Canceled]: "4",
  [Archived]: "5",
};

const updateStatusBinds = (status: ItemStatus): KeyBinding => ({
  id: `updateTo:${status}`,
  keys: [statusToKey[status]],
  modes: ["normal"],
  scope: "list",
  description: statusMapper[status],
  hint: {
    group: "item",
  },
  when: ({ pane }) => {
    return (
      pane.type === "list" &&
      pane.markedIds.size === 0 &&
      pane.selectedId !== null &&
      pane.selectedId !== undefined
    );
  },
  run: ({ app, pane }) => {
    if (pane.type !== "list") return;
    if (pane.selectedId) app.items.setField(pane.selectedId, "status", status);
  },
});

const bulkUpdateStatusBinds = (status: ItemStatus): KeyBinding => ({
  id: `bulkUpdateTo:${status}`,
  keys: [`${statusToKey[status]}`],
  modes: ["normal"],
  scope: "list",
  description: `Bulk ${statusMapper[status]}`,
  hint: {
    group: "item",
  },
  when: ({ pane }) => {
    return pane.type === "list" && pane.markedIds.size > 0;
  },
  run: ({ app, pane }) => {
    if (pane.type !== "list") return;
    if (pane.markedIds.size > 0) app.items.bulkSetField([...pane.markedIds], "status", status);
  },
});

export const statusKeyBindings: KeyBinding[] = Object.keys(statusToKey).map((s) =>
  updateStatusBinds(s),
);

export const bulkUpdateStatusBindings: KeyBinding[] = Object.keys(statusToKey).map((s) =>
  bulkUpdateStatusBinds(s),
);
