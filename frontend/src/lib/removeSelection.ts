import { useUiStore } from "../stores/ui";
import type { ListPane } from "./pane/types";
import type { AppContext } from "./types";
import { t } from "./i18n";

export function targetGuids(pane: ListPane): string[] {
  if (pane.markedGuids.size > 0) return [...pane.markedGuids];
  return pane.selectedGuid ? [pane.selectedGuid] : [];
}

export function leavePane(app: AppContext, pane: ListPane, guids: string[]) {
  const gone = new Set(guids);
  const from = pane.selectedGuid ? pane.renderedGuids.indexOf(pane.selectedGuid) : -1;
  const next =
    pane.selectedGuid && !gone.has(pane.selectedGuid)
      ? pane.selectedGuid
      : (pane.renderedGuids.slice(from + 1).find((g) => !gone.has(g)) ??
        pane.renderedGuids
          .slice(0, Math.max(from, 0))
          .reverse()
          .find((g) => !gone.has(g)) ??
        null);

  const filtered = Object.entries(pane.filter).some(
    ([key, value]) => key !== "parent_id" && value !== undefined,
  );
  const at = useUiStore.getState().panes.findIndex((p) => p.id === pane.id);

  if (next === null && !filtered && at > 0) {
    useUiStore.setState((s) => {
      const panes = s.panes.slice(0, at);
      return { panes, activePaneId: panes[at - 1].id, mode: "normal" };
    });
    return;
  }

  useUiStore.setState((s) => ({
    panes: s.panes.map((p) =>
      p.id === pane.id ? { ...p, markedGuids: new Set(), anchorGuid: null } : p,
    ),
  }));
  app.ui.select(pane.id, next);
}

export async function removeSelection(app: AppContext, pane: ListPane): Promise<string | undefined> {
  const guids = targetGuids(pane);
  if (guids.length === 0) return t("Select or mark an item");

  leavePane(app, pane, guids);

  try {
    await app.items.remove(guids);
  } catch (err) {
    return err instanceof Error ? err.message : t("Delete failed");
  }
}
