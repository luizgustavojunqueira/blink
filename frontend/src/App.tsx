import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ItemList } from "./components/itemList/itemList";
import Prompt from "./components/prompt";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-screen">
        <ItemList />
      </div>
    </QueryClientProvider>
  );
}

export default App;
