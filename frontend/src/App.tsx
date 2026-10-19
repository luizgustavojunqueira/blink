import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useEffect, useState } from "react";
import { getAppContext } from "./lib/appContext";
import { useKeyMap } from "./hooks/useKeyMap";
import { useUiStore } from "./stores/ui";
import { useVisiblePanes } from "./hooks/usePane";
import { paneRegistry } from "./lib/pane/registry";
import Hint from "./components/hint/hint";
import Loading from "./components/loading";
import { bootUrlState, hasUrlState } from "./lib/urlState";

function Main() {
  useKeyMap(getAppContext());

  const [ready, setReady] = useState(() => !hasUrlState());

  useEffect(() => {
    bootUrlState(queryClient).then(() => setReady(true));
  }, []);

  const panes = useVisiblePanes(2);
  const activePaneId = useUiStore((s) => s.activePaneId);

  const colCount = panes.length;

  if (!ready) return <Loading />;

  return (
    <div
      className={`grid grid-rows-1 h-screen bg-bg text-fg font-mono overflow-hidden`}
      style={{ gridTemplateColumns: colCount == 1 ? "1fr" : "1fr 2fr" }}
    >
      {panes.map((pane) => {
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
      <Hint />
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
