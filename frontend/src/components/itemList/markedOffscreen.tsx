import { useEffect, useState, type RefObject } from "react";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";

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

interface IMarkedOffscreen {
  paneId: string;
  listRef: RefObject<HTMLUListElement | null>;
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
      const rows = list.children;
      const box = container.getBoundingClientRect();
      const first = firstIndexWhere(rows, (r) => r.getBoundingClientRect().bottom > box.top);
      const last = firstIndexWhere(rows, (r) => r.getBoundingClientRect().top >= box.bottom) - 1;

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
