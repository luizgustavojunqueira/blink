import type { CommandDefinition } from "../types";

export const profileCommand: CommandDefinition = {
  id: "profile",
  displayName: "profile",
  description: "Open your account (password, log out, delete)",
  execute: ({ app }) => {
    app.ui.setPrompt("");
    app.ui.openProfile();
  },
};
