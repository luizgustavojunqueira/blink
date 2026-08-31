import { useEffect, useRef } from "react";
import type { AppContext } from "../lib/types";
import type { KeyContext } from "../lib/keymap/types";
import { useUiStore } from "../stores/ui";
import { resolve } from "../lib/keymap/registry";

export function useKeyMap(app: AppContext) {
  const appRef = useRef(app);
  appRef.current = app;

  const currentSeq = useRef<string>("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useUiStore.getState();
      const pane = state.panes.find((p) => p.id === state.activePaneId);
      if (!pane) return;

      const ctx: KeyContext = {
        app: { ...appRef.current, ui: state },
        pane,
      };

      const key = eventToKey(e);
      let finalKey = "";
      if (currentSeq.current != "") {
        finalKey = `${currentSeq.current}`;
      }

      finalKey = `${finalKey}${key}`;

      const binding = resolve(finalKey, ctx);
      if (!binding) {
        if (currentSeq.current == "") {
          currentSeq.current = key;
        } else {
          currentSeq.current = "";
        }

        return;
      }
      if (binding.run(ctx, key) == false) return;
      e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export function eventToKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.metaKey) parts.push("meta");
  if (e.shiftKey && e.key.length > 1) parts.push("shift");
  parts.push(e.key.length === 1 ? e.key : e.key.toLowerCase());
  return parts.join("+");
}
