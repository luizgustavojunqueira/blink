import { PROFILE_ROW_IDS, parseProfileRow, type ProfileRowKind } from "../../profile/rows";
import { useAuthStore } from "../../auth/store";
import type { AppContext } from "../../types";
import type { Pane } from "../../pane/types";
import type { KeyBinding, KeyQueryContext } from "../types";

const rowOf = (pane: Pane): ProfileRowKind | null =>
  pane.type === "profile" ? parseProfileRow(pane.selectedRow) : null;

const onRow =
  (...kinds: ProfileRowKind[]) =>
  ({ pane }: KeyQueryContext) => {
    const row = rowOf(pane);
    return !!row && kinds.includes(row);
  };

function moveRow(app: AppContext, pane: Pane, to: (index: number, last: number) => number) {
  if (pane.type !== "profile") return;

  const last = PROFILE_ROW_IDS.length - 1;
  const index = PROFILE_ROW_IDS.indexOf(pane.selectedRow ?? "");
  const next = Math.min(Math.max(to(index, last), 0), last);
  app.ui.selectRow(pane.id, PROFILE_ROW_IDS[next]);
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
  scope: "profile",
  description,
  hint: { group: "nav" },
  fixed: true,
  run: ({ app, pane }) => moveRow(app, pane, to),
});

export const profilePaneBindings: KeyBinding[] = [
  nav("profile:down", ["j", "arrowdown"], "Next row", (i) => (i === -1 ? 0 : i + 1)),
  nav("profile:up", ["k", "arrowup"], "Previous row", (i, last) => (i === -1 ? last : i - 1)),
  nav("profile:top", ["g g"], "Move to top", () => 0),
  nav("profile:bottom", ["G"], "Move to bottom", (_, last) => last),
  {
    id: "profile:edit",
    keys: ["i", "enter"],
    modes: ["normal"],
    scope: "profile",
    description: "Open",
    hint: { group: "item" },
    fixed: true,
    when: onRow("password", "delete"),
    run: ({ app }) => app.ui.enterInsert(),
  },
  {
    id: "profile:logout",
    keys: ["enter", "space"],
    modes: ["normal"],
    scope: "profile",
    description: "Log out",
    hint: { group: "item" },
    fixed: true,
    when: onRow("logout"),
    run: () => {
      void useAuthStore.getState().logout();
    },
  },
];
