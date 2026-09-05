import { useEffect, useRef } from "react";
import type { AppContext } from "../lib/types";
import type { KeyContext, KeyQueryContext } from "../lib/keymap/types";
import { useUiStore } from "../stores/ui";
import { isPrefix, resolve } from "../lib/keymap/registry";

export function useKeyMap(app: AppContext) {
  const appRef = useRef(app);
  appRef.current = app;

  const currentSeq = useRef<string>("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useUiStore.getState();
      const pane = state.panes.find((p) => p.id === state.activePaneId);
      if (!pane) return;

      const ctxQuery: KeyQueryContext = {
        ui: state,
        pane,
      };

      const key = eventToKey(e);
      if (!key) return;

      const pending = currentSeq.current;
      currentSeq.current = "";

      const attempts = pending ? [`${pending} ${key}`, key] : [key];

      for (const seq of attempts) {
        const binding = resolve(seq, ctxQuery);

        if (binding) {
          const ctxRun: KeyContext = {
            app: { ...appRef.current, ui: state },
            pane,
          };
          if (binding.run(ctxRun, key) == false) return;
          e.preventDefault();
          return;
        }

        if (isPrefix(seq, ctxQuery)) {
          currentSeq.current = seq;
          e.preventDefault();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export function eventToKey(e: KeyboardEvent): string {
  if (["Control", "Alt", "Meta", "Shift"].includes(e.key)) {
    return "";
  }
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.metaKey) parts.push("meta");
  if (e.shiftKey && e.key.length > 1) parts.push("shift");

  if (e.key === " ") {
    parts.push("space");
  } else {
    parts.push(e.key.length === 1 ? e.key : e.key.toLowerCase());
  }

  return parts.join("+");
}
