import { currentArgToken } from "../argToken";
import { toPromptOption } from "../../promptOptions";
import { BUILTIN_THEMES } from "../../theme";
import { themeNames, useConfigStore } from "../../config/store";
import type { CommandDefinition } from "../types";

export const THEMES = BUILTIN_THEMES;

const allThemes = () => themeNames(useConfigStore.getState().themes);

export const themeCommand: CommandDefinition = {
  id: "theme",
  displayName: "theme",
  description: "Switch color theme",
  argCount: 1,
  getOptions: (rawArgs) => {
    const filter = currentArgToken(rawArgs).current.toLowerCase();

    return allThemes()
      .filter((t) => t.includes(filter))
      .map((t) =>
        toPromptOption("COMMAND_ARG", {
          name: t,
          description: `Set theme to ${t}`,
          value: t,
        }),
      );
  },
  execute: async ({ rawArgs, app }) => {
    const theme = rawArgs.trim().toLowerCase();
    const themes = allThemes();
    if (!themes.includes(theme)) {
      return { message: `Invalid theme "${theme}". Try: ${themes.join(", ")}` };
    }

    app.setTheme(theme);

    return { shouldClearPrompt: true };
  },
};
