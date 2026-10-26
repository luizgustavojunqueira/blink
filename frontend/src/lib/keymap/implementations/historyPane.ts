import { queryClient } from "../../queryClient";
import type { ItemHistoryEntry } from "../../../types/backend";
import type { AppContext } from "../../types";
import type { Pane } from "../../pane/types";
import type { KeyBinding } from "../types";

function moveRow(app: AppContext, pane: Pane, to: (index: number, last: number) => number) {
  if (pane.type !== "history") return;

  const entries = queryClient.getQueryData<ItemHistoryEntry[]>(["history", pane.itemGuid]);
  if (!entries || entries.length === 0) return;

  const last = entries.length - 1;
  const index = pane.selectedRow === null ? -1 : Number(pane.selectedRow);
  const next = Math.min(Math.max(to(index, last), 0), last);
  app.ui.selectRow(pane.id, String(next));
}

const nav = (
  id: string,
  keys: string[],
  description: string,
  to: (index: number, last: number) => number,
): KeyBinding => ({
  id,
  keys,
  modes: ["normal"],
  scope: "history",
  description,
  hint: { group: "nav" },
  fixed: true,
  run: ({ app, pane }) => moveRow(app, pane, to),
});

export const historyPaneBindings: KeyBinding[] = [
  nav("history:down", ["j", "arrowdown"], "Next entry", (i) => (i === -1 ? 0 : i + 1)),
  nav("history:up", ["k", "arrowup"], "Previous entry", (i, last) => (i === -1 ? last : i - 1)),
  nav("history:pagedown", ["ctrl+d", "ctrl+arrowdown"], "Move 5 down", (i) => i + 5),
  nav("history:pageup", ["ctrl+u", "ctrl+arrowup"], "Move 5 up", (i, last) => (i === -1 ? last : i - 5)),
  nav("history:top", ["g g"], "Move to top", () => 0),
  nav("history:bottom", ["G"], "Move to bottom", (_, last) => last),
];
