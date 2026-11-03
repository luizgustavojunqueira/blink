import type { CommandDefinition } from "../../commands/types";
import { toPromptOption } from "../../promptOptions";
import { descriptionModifier } from "./description";
import { dueModifier } from "./due";
import { orderModifier } from "./order";
import { priorityModifier } from "./priority";
import { statusModifier } from "./status";
import { tagModifier } from "./tag";

const OTHER_MODIFIERS = [
  statusModifier,
  priorityModifier,
  tagModifier,
  descriptionModifier,
  dueModifier,
  orderModifier,
];

export const helpOptions = (allowed?: readonly string[]) =>
  OTHER_MODIFIERS.filter((m) => !allowed || allowed.includes(m.id)).map((m) =>
    toPromptOption("MODIFIER", {
      name: m.id,
      description: m.description,
      value: m.id,
    }),
  );

export const helpModifier: CommandDefinition = {
  id: "?",
  displayName: "?",
  description: "Show available modifiers",
  getOptions: () => helpOptions(),
};
