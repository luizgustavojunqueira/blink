import type { CommandDefinition } from "../../commands/types";
import { DESCRIPTION_MODIFIER } from "../delimiters";
import { extractRest } from "../extract";

export const descriptionModifier: CommandDefinition = {
  id: DESCRIPTION_MODIFIER,
  displayName: DESCRIPTION_MODIFIER,
  description: "Description",

  extractKind: "rest",
  extract: (raw) => extractRest(raw, DESCRIPTION_MODIFIER),
};
