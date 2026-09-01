import { TAG_MODIFIER } from "../delimiters";
import type { CommandDefinition } from "../../commands/types";
import { extractDelimited } from "../extract";
import { normalizeTagText } from "../../tags/normalizeTagText";
import { toPromptOption } from "../../promptOptions";

export type TagModifierOptions = {
  tags: string[];
};

export const tagModifier: CommandDefinition<TagModifierOptions> = {
  id: TAG_MODIFIER,
  displayName: TAG_MODIFIER,
  description: "Filter by tag",

  getOptions: (rawArgs: string, options?: TagModifierOptions) => {
    if (!options) return [];
    const filter = rawArgs.trim().toLowerCase();
    return options.tags
      .filter((tag) => tag.toLowerCase().includes(filter))
      .map((tag) => toPromptOption("TAG", { name: tag, value: tag, description: "" }));
  },
  extract: (raw) => extractDelimited(normalizeTagText(raw), TAG_MODIFIER),
};
