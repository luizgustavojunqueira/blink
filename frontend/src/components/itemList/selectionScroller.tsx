import { useEffect, type RefObject } from "react";
import { useListPaneSelectedId } from "../../hooks/usePane";

interface ISelectionScroller {
  paneId: string;
  listRef: RefObject<HTMLUListElement | null>;
}

export default function SelectionScroller({ paneId, listRef }: ISelectionScroller) {
  const selectedId = useListPaneSelectedId(paneId);

  useEffect(() => {
    if (!selectedId) return;

    const element = listRef.current?.querySelector<HTMLElement>(`[data-item-id="${selectedId}"]`);

    element?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [selectedId, listRef]);

  return null;
}
