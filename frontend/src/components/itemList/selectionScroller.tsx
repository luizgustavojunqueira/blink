import { useEffect, type RefObject } from "react";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";

const selectSelectedId: PaneSelector<string | null> = (pane) =>
  pane?.type === "list" ? pane.selectedId : null;

interface ISelectionScroller {
  paneId: string;
  listRef: RefObject<HTMLUListElement | null>;
}

export default function SelectionScroller({ paneId, listRef }: ISelectionScroller) {
  const selectedId = usePaneValue(paneId, selectSelectedId);

  useEffect(() => {
    if (!selectedId) return;

    const element = listRef.current?.querySelector<HTMLElement>(`[data-item-id="${selectedId}"]`);

    element?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [selectedId, listRef]);

  return null;
}
