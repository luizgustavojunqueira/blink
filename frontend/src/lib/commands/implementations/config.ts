import { themeRowId } from "../../config/rowId";
import type { CommandDefinition } from "../types";

export const configCommand: CommandDefinition = {
  id: "config",
  displayName: "config",
  description: "Open settings (theme, colors, keys)",
  execute: ({ app }) => {
    app.ui.setPrompt("");
    app.ui.openConfig(themeRowId(app.config.get().theme));
  },
};
