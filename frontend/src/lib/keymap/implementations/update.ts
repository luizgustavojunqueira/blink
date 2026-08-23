import {
  Archived,
  Canceled,
  Done,
  InProgress,
  ToDo,
  type ItemStatus,
} from "../../../types/backend";
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
  run: ({ app }) => {
    if (app.ui.selectedId) app.items.setStatus(app.ui.selectedId, status);
  },
});

export const statusKeyBindings: KeyBinding[] = Object.keys(statusToKey).map((s) =>
  updateStatusBinds(s),
);
