// src/App.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ItemList } from "./components/itemList/itemList";
import { useEffect } from "react";
import { getTheme, setTheme } from "./lib/theme";
import { useAppContext } from "./hooks/useAppContext";
import { useKeyMap } from "./hooks/useKeyMap";

function Main() {
  const app = useAppContext();
  useKeyMap(app);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTheme(getTheme());
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg text-fg font-mono overflow-hidden">
      <ItemList app={app} />
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
