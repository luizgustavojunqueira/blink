import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App.tsx";
import { bootConfig } from "./lib/config/store";

bootConfig();

createRoot(document.getElementById("root")!).render(<App />);
