import { useEffect, type RefObject } from "react";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";

const selectSelectedId: PaneSelector<string | null> = (pane) =>
  pane?.type === "list" ? pane.selectedId : null;

interface ISelectionScroller {
  paneId: string;
  listRef: RefObject<HTMLUListElement | null>;
}

const SCROLLOFF: number = 3;

export default function SelectionScroller({ paneId, listRef }: ISelectionScroller) {
  const selectedId = usePaneValue(paneId, selectSelectedId);

  useEffect(() => {
    if (!selectedId) return;

    const list = listRef.current;
    const container = list?.parentElement;
    const element = list?.querySelector<HTMLElement>(`[data-item-id="${selectedId}"]`);

    if (!container || !element) return;

    let top = element;
    let bottom = element;

    // walks SCROLLOFF siblings up and down
    for (let i = 0; i < SCROLLOFF; i++) {
      top = (top.previousElementSibling as HTMLElement | null) ?? top;
      bottom = (bottom.nextElementSibling as HTMLElement | null) ?? bottom;
    }

    // gets list rect
    const box = container.getBoundingClientRect();

    const topEdge = top.getBoundingClientRect().top;
    const bottomEdge = bottom.getBoundingClientRect().bottom;

    if (topEdge < box.top) container.scrollTop += topEdge - box.top;
    else if (bottomEdge > box.bottom) container.scrollTop += bottomEdge - box.bottom;
  }, [selectedId, listRef]);

  return null;
}
