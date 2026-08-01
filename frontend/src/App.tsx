import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ItemList } from "./components/itemList/itemList";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("blink-theme") ?? "gruvbox";
    document.documentElement.className = `theme-${saved}`;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-screen bg-bg text-fg font-mono overflow-hidden">
        <ItemList />
      </div>
    </QueryClientProvider>
  );
}

export default App;
