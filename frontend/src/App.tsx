import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useEffect } from "react";
import { getTheme, setTheme } from "./lib/theme";
import { useAppContext } from "./hooks/useAppContext";
import { useKeyMap } from "./hooks/useKeyMap";
import { useUiStore } from "./stores/ui";
import { paneRegistry } from "./lib/pane/registry";

function Main() {
  const app = useAppContext();
  useKeyMap(app);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTheme(getTheme());
  }, []);

  const { panes, activePaneId } = useUiStore();

  const colCount = panes.slice(-2).length;

  return (
    <div
      className={`grid grid-rows-1 h-screen bg-bg text-fg font-mono overflow-hidden`}
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
    >
      {panes.slice(-2).map((pane) => {
        const { Component } = paneRegistry[pane.type];
        return (
          <div
            key={pane.id}
            className={`${pane.id === activePaneId ? "..." : "..."} min-w-0 overflow-hidden`}
          >
            <Component paneId={pane.id} />
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Main />
    </QueryClientProvider>
  );
}
