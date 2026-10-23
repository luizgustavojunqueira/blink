import { useLayoutEffect, useRef, type DependencyList, type RefObject } from "react";

const RESIZE_MS = 90;

export function useResizeAnimation(ref: RefObject<HTMLElement | null>, deps: DependencyList) {
  const lastSize = useRef<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      lastSize.current = null;
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const prev = lastSize.current;
    lastSize.current = { w, h };
    if (!prev || (prev.w === w && prev.h === h)) return;
    if (document.documentElement.dataset.motion === "off") return;
    el.getAnimations().forEach((a) => a.cancel());
    el.style.overflow = "hidden";
    const anim = el.animate(
      [
        { width: `${prev.w}px`, height: `${prev.h}px` },
        { width: `${w}px`, height: `${h}px` },
      ],
      { duration: RESIZE_MS, easing: "ease-out" },
    );
    anim.onfinish = anim.oncancel = () => {
      el.style.overflow = "";
    };
  }, deps);
}
