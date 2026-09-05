import type { UiState } from "../../stores/ui";
import type { Pane } from "../pane/types";
import type { KeyQueryContext } from "./types";

export function queryContext(ui: UiState, pane: Pane): KeyQueryContext {
  const itemType =
    pane.type === "list" && pane.selectedId ? pane.renderedTypes[pane.selectedId] : undefined;

  return { ui, pane, itemType };
}
