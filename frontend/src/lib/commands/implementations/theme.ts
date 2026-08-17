import { currentArgToken } from "../argToken";
import { toPromptOption } from "../../promptOptions";
import type { CommandDefinition } from "../types";

const THEMES = ["gruvbox", "catppuccin", "nord"];

export const themeCommand: CommandDefinition = {
  id: "theme",
  displayName: "/theme",
  description: "Switch color theme",
  argCount: 1,
  getOptions: (rawArgs) => {
    const filter = currentArgToken(rawArgs).current.toLowerCase();

    return THEMES.filter((t) => t.includes(filter)).map((t) =>
      toPromptOption("COMMAND_ARG", {
        name: t,
        description: `Set theme to ${t}`,
        value: t,
      }),
    );
  },
  execute: async ({ rawArgs }) => {
    const theme = rawArgs.trim().toLowerCase();
    if (!THEMES.includes(theme)) {
      return { message: `Invalid theme "${theme}". Try: ${THEMES.join(", ")}` };
    }

    set({ theme });
    return { shouldClearPrompt: true };
  },
};

function set({ theme }: { theme: string }) {
  document.documentElement.className = `theme-${theme}`;
  localStorage.setItem("theme", theme);
}
