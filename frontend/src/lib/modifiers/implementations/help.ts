import type { CommandDefinition } from "../../commands/types";
import { toPromptOption } from "../../promptOptions";
import { descriptionModifier } from "./description";
import { priorityModifier } from "./priority";
import { statusModifier } from "./status";
import { tagModifier } from "./tag";

// Imports the other modifiers directly instead of going through
// modifiers/registry.ts's getAllModifiers() — that registry imports this
// file too, and going through it here would create a circular dependency.
const OTHER_MODIFIERS = [statusModifier, priorityModifier, tagModifier, descriptionModifier];

export const helpModifier: CommandDefinition = {
  id: "?",
  displayName: "?",
  description: "Show available modifiers",
  getOptions: () =>
    OTHER_MODIFIERS.map((m) =>
      toPromptOption("MODIFIER", {
        name: m.id,
        description: m.description,
        value: m.id,
      }),
    ),
};
