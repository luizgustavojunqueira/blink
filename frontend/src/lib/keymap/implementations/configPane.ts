import { isBuiltinTheme } from "../../theme";
import { parseRowId, themeRowId, type RowRef } from "../../config/rowId";
import type { AppContext } from "../../types";
import type { Pane } from "../../pane/types";
import type { KeyBinding, KeyQueryContext } from "../types";

const rowOf = (pane: Pane): RowRef | null =>
  pane.type === "config" ? parseRowId(pane.selectedRow) : null;

const onRow =
  (test: (row: RowRef) => boolean) =>
  ({ pane }: KeyQueryContext) => {
    const row = rowOf(pane);
    return !!row && test(row);
  };

const isCustomTheme = (row: RowRef) =>
  row.kind === "theme" && !isBuiltinTheme(row.name);

function moveRow(
  app: AppContext,
  pane: Pane,
  to: (index: number, last: number) => number,
) {
  if (pane.type !== "config") return;
  const rows = app.config.rows();
  if (rows.length === 0) return;

  const index = rows.findIndex((r) => r.id === pane.selectedRow);
  const next = Math.min(
    Math.max(to(index, rows.length - 1), 0),
    rows.length - 1,
  );
  app.ui.selectRow(pane.id, rows[next].id);
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
  scope: "config",
  description,
  hint: { group: "nav" },
  fixed: true,
  run: ({ app, pane }) => moveRow(app, pane, to),
});

export const configPaneBindings: KeyBinding[] = [
  nav("config:down", ["j", "arrowdown"], "Next row", (i) =>
    i === -1 ? 0 : i + 1,
  ),
  nav("config:up", ["k", "arrowup"], "Previous row", (i, last) =>
    i === -1 ? last : i - 1,
  ),
  nav(
    "config:pagedown",
    ["ctrl+d", "ctrl+arrowdown"],
    "Move 5 down",
    (i) => i + 5,
  ),
  nav("config:pageup", ["ctrl+u", "ctrl+arrowup"], "Move 5 up", (i, last) =>
    i === -1 ? last : i - 5,
  ),
  nav("config:top", ["g g"], "Move to top", () => 0),
  nav("config:bottom", ["G"], "Move to bottom", (_, last) => last),
  {
    id: "config:apply",
    keys: ["enter", "space"],
    modes: ["normal"],
    scope: "config",
    description: "Use theme",
    hint: { group: "item" },
    fixed: true,
    when: onRow((row) => row.kind === "theme"),
    run: ({ app, pane }) => {
      const row = rowOf(pane);
      if (row?.kind === "theme") app.config.setTheme(row.name);
    },
  },
  {
    id: "config:edit",
    keys: ["i", "enter"],
    modes: ["normal"],
    scope: "config",
    description: "Edit",
    hint: { group: "item" },
    fixed: true,
    when: onRow((row) => row.kind === "key" || row.kind === "color"),
    run: ({ app }) => app.ui.enterInsert(),
  },
  {
    id: "config:rename",
    keys: ["i"],
    modes: ["normal"],
    scope: "config",
    description: "Rename theme",
    hint: { group: "item" },
    fixed: true,
    when: onRow(isCustomTheme),
    run: ({ app }) => app.ui.enterInsert(),
  },
  {
    id: "config:duplicate",
    keys: ["y"],
    modes: ["normal"],
    scope: "config",
    description: "Copy theme to edit",
    hint: { group: "item" },
    fixed: true,
    when: onRow((row) => row.kind === "theme"),
    run: ({ app, pane }) => {
      const row = rowOf(pane);
      if (row?.kind !== "theme") return;
      const name = app.config.duplicateTheme(row.name);
      if (name) app.ui.selectRow(pane.id, themeRowId(name));
    },
  },
  {
    id: "config:delete",
    keys: ["d d"],
    modes: ["normal"],
    scope: "config",
    description: "Delete theme",
    hint: { group: "item" },
    fixed: true,
    when: onRow(isCustomTheme),
    run: ({ app, pane }) => {
      const row = rowOf(pane);
      if (row?.kind !== "theme") return;
      app.config.deleteTheme(row.name);
      app.ui.selectRow(pane.id, themeRowId(app.config.get().theme));
    },
  },
  {
    id: "config:reset",
    keys: ["r"],
    modes: ["normal"],
    scope: "config",
    description: "Reset to default",
    hint: { group: "item" },
    fixed: true,
    when: onRow((row) => row.kind === "key"),
    run: ({ app, pane }) => {
      const row = rowOf(pane);
      if (row?.kind === "key") app.config.resetKeys(row.bindingId);
    },
  },
];
