import { currentArgToken } from "../argToken";
import { toPromptOption } from "../../promptOptions";
import { BUILTIN_THEMES } from "../../theme";
import { themeNames, useConfigStore } from "../../config/store";
import type { CommandDefinition } from "../types";
import { t } from "../../i18n";

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
      .filter((name) => name.includes(filter))
      .map((name) =>
        toPromptOption("COMMAND_ARG", {
          name,
          description: t("Set theme to {name}", { name }),
          value: name,
        }),
      );
  },
  execute: async ({ rawArgs, app }) => {
    const theme = rawArgs.trim().toLowerCase();
    const themes = allThemes();
    if (!themes.includes(theme)) {
      return { message: t('Invalid theme "{name}". Try: {themes}', { name: theme, themes: themes.join(", ") }) };
    }

    app.setTheme(theme);

    return { shouldClearPrompt: true };
  },
};
