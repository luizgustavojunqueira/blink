import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { GetItemRequest, GetItemResponse } from "../types/backend";

export const FLIP_MS = 90;

const ENTER: Keyframe[] = [
  { opacity: 0, transform: "scaleY(0.6)", transformOrigin: "top" },
  { opacity: 1, transform: "none", transformOrigin: "top" },
];

export function useFilterFlip(
  listRef: RefObject<HTMLElement | null>,
  items: GetItemResponse[],
  filter: GetItemRequest,
  chunkRows: number,
) {
  const pending = useRef(false);
  const lastFilter = useRef(JSON.stringify(filter));
  const lastParent = useRef(filter.parent_id);
  const lastItems = useRef(items);
  const lastScroll = useRef(0);
  const running = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    const key = JSON.stringify(filter);
    if (key === lastFilter.current) return;
    pending.current = lastParent.current === filter.parent_id;
    lastFilter.current = key;
    lastParent.current = filter.parent_id;
  }, [filter]);

  useEffect(() => {
    const scroller = listRef.current?.parentElement;
    if (!scroller) return;
    const onScroll = () => (lastScroll.current = scroller.scrollTop);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [listRef]);

  useLayoutEffect(() => {
    const prev = lastItems.current;
    if (prev === items) return;
    lastItems.current = items;

    const list = listRef.current;
    const scroller = list?.parentElement;
    if (!list || !scroller) return;

    const oldScroll = lastScroll.current;
    const newScroll = (lastScroll.current = scroller.scrollTop);

    if (!pending.current) return;
    pending.current = false;
    if (document.documentElement.dataset.motion === "off") return;

    running.current.forEach((a) => a.cancel());
    running.current = [];

    const rowHeight = list.querySelector("li")?.offsetHeight;
    if (!rowHeight) return;

    const viewport = scroller.clientHeight;
    const listTop = list.getBoundingClientRect().top - scroller.getBoundingClientRect().top + newScroll;
    const from = Math.max(0, Math.floor((newScroll - listTop) / rowHeight));
    const to = Math.min(items.length, Math.ceil((newScroll + viewport - listTop) / rowHeight));
    if (from >= to) return;

    const visible = new Set<string>();
    for (let i = from; i < to; i++) visible.add(items[i].guid);
    const oldIndex = new Map<string, number>();
    for (let i = 0; i < prev.length && oldIndex.size < visible.size; i++) {
      if (visible.has(prev[i].guid)) oldIndex.set(prev[i].guid, i);
    }

    const timing = { duration: FLIP_MS, easing: "ease-out" };
    for (let i = from; i < to; i++) {
      const row = list.children[Math.floor(i / chunkRows)]?.children[i % chunkRows] as HTMLElement | undefined;
      if (!row) continue;

      const old = oldIndex.get(items[i].guid);
      if (old === undefined) {
        running.current.push(row.animate(ENTER, timing));
        continue;
      }

      const shift = (old - i) * rowHeight - (oldScroll - newScroll);
      const dy = Math.max(-viewport, Math.min(viewport, shift));
      if (Math.abs(dy) < 1) continue;
      running.current.push(
        row.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], timing),
      );
    }
  }, [items, listRef, chunkRows]);
}
