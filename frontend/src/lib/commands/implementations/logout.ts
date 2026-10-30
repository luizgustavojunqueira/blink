import { useAuthStore } from "../../auth/store";
import type { CommandDefinition } from "../types";

export const logoutCommand: CommandDefinition = {
  id: "logout",
  displayName: "logout",
  description: "Log out of your account",
  execute: async ({ app }) => {
    app.ui.setPrompt("");
    await useAuthStore.getState().logout();
  },
};
