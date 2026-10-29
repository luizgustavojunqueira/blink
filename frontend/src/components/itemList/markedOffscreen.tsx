import { useEffect, useState, type RefObject } from "react";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { guidIndex } from "../../hooks/useRowState";

const EMPTY_GUIDS: string[] = [];
const EMPTY_MARKED = new Set<string>();

const selectMarkedGuids: PaneSelector<Set<string>> = (pane) =>
  pane?.type === "list" ? pane.markedGuids : EMPTY_MARKED;

const selectRenderedGuids: PaneSelector<string[]> = (pane) =>
  pane?.type === "list" ? pane.renderedGuids : EMPTY_GUIDS;

const firstIndexWhere = (rows: HTMLCollection, test: (row: Element) => boolean) => {
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (test(rows[mid])) hi = mid;
    else lo = mid + 1;
  }
  return lo;
};

const firstRowIndex = (list: Element, guids: string[], test: (row: Element) => boolean) => {
  const chunks = list.children;
  const chunk = chunks[firstIndexWhere(chunks, test)];
  if (!chunk) return guids.length;
  const row = chunk.children[firstIndexWhere(chunk.children, test)];
  const guid = row?.getAttribute("data-item-guid");
  return guid ? guidIndex(guids, guid) : guids.length;
};

interface IMarkedOffscreen {
  paneId: string;
  listRef: RefObject<HTMLElement | null>;
}

export default function MarkedOffscreen({ paneId, listRef }: IMarkedOffscreen) {
  const markedGuids = usePaneValue(paneId, selectMarkedGuids);
  const renderedGuids = usePaneValue(paneId, selectRenderedGuids);
  const [counts, setCounts] = useState({ above: 0, below: 0 });

  useEffect(() => {
    const list = listRef.current;
    const container = list?.parentElement;
    if (!list || !container) return;

    const measure = () => {
      const box = container.getBoundingClientRect();
      const first = firstRowIndex(list, renderedGuids, (r) => r.getBoundingClientRect().bottom > box.top);
      const last = Math.min(
        firstRowIndex(list, renderedGuids, (r) => r.getBoundingClientRect().bottom >= box.bottom),
        renderedGuids.length - 1,
      );

      let above = 0;
      let below = 0;
      renderedGuids.forEach((guid, i) => {
        if (!markedGuids.has(guid)) return;
        if (i < first) above++;
        else if (i > last) below++;
      });

      setCounts((c) => (c.above === above && c.below === below ? c : { above, below }));
    };

    if (markedGuids.size === 0) {
      setCounts((c) => (c.above === 0 && c.below === 0 ? c : { above: 0, below: 0 }));
      return;
    }

    measure();
    container.addEventListener("scroll", measure, { passive: true });
    return () => container.removeEventListener("scroll", measure);
  }, [markedGuids, renderedGuids, listRef]);

  if (counts.above === 0 && counts.below === 0) return null;

  return (
    <span className="shrink-0 text-xs text-accent">
      {counts.above > 0 && `↑${counts.above}`}
      {counts.above > 0 && counts.below > 0 && " "}
      {counts.below > 0 && `↓${counts.below}`}
    </span>
  );
}
