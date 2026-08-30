import { TAG_MODIFIER } from "../delimiters";
import type { CommandDefinition } from "../../commands/types";
import { extractDelimited } from "../extract";
import { normalizeTagText } from "../../tags/normalizeTagText";

export const tagModifier: CommandDefinition = {
  id: TAG_MODIFIER,
  displayName: TAG_MODIFIER,
  description: "Filter by tag",
  getOptions: (_rawArgs) => {
    return []
  },
  extract: (raw) => extractDelimited(normalizeTagText(raw), TAG_MODIFIER),
};
