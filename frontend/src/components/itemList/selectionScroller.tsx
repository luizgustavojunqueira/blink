import { useEffect, type RefObject } from "react";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";

const selectSelectedGuid: PaneSelector<string | null> = (pane) =>
  pane?.type === "list" ? pane.selectedGuid : null;

interface ISelectionScroller {
  paneId: string;
  listRef: RefObject<HTMLElement | null>;
}

const SCROLLOFF: number = 3;

const previousRow = (row: HTMLElement) =>
  (row.previousElementSibling ?? row.parentElement?.previousElementSibling?.lastElementChild) as HTMLElement | null;

const nextRow = (row: HTMLElement) =>
  (row.nextElementSibling ?? row.parentElement?.nextElementSibling?.firstElementChild) as HTMLElement | null;

export default function SelectionScroller({ paneId, listRef }: ISelectionScroller) {
  const selectedGuid = usePaneValue(paneId, selectSelectedGuid);

  useEffect(() => {
    if (!selectedGuid) return;

    const list = listRef.current;
    const container = list?.parentElement;
    const element = list?.querySelector<HTMLElement>(`[data-item-guid="${selectedGuid}"]`);

    if (!container || !element) return;

    let top = element;
    let bottom = element;

    // walks SCROLLOFF siblings up and down
    for (let i = 0; i < SCROLLOFF; i++) {
      top = previousRow(top) ?? top;
      bottom = nextRow(bottom) ?? bottom;
    }

    // gets list rect
    const box = container.getBoundingClientRect();

    const topEdge = top.getBoundingClientRect().top;
    const bottomEdge = bottom.getBoundingClientRect().bottom;

    if (topEdge < box.top) container.scrollTop += topEdge - box.top;
    else if (bottomEdge > box.bottom) container.scrollTop += bottomEdge - box.bottom;
  }, [selectedGuid, listRef]);

  return null;
}
