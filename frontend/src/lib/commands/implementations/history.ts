import type { CommandDefinition } from "../types";

export const historyCommand: CommandDefinition = {
  id: "history",
  displayName: "history",
  description: "Show the change log of the selected item",
  execute: ({ app }) => {
    app.ui.setPrompt("");
    app.ui.openHistory();
  },
};
