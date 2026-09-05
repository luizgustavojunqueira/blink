import type { CommandDefinition } from "../commands/types";
import {
  DESCRIPTION_MODIFIER,
  HELP_MODIFIER,
  ORDER_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
  TYPE_MODIFIER,
} from "./delimiters";
import { descriptionModifier } from "./implementations/description";
import { helpModifier } from "./implementations/help";
import { orderModifier } from "./implementations/order";
import { priorityModifier } from "./implementations/priority";
import { statusModifier } from "./implementations/status";
import { tagModifier } from "./implementations/tag";
import { typeModifier } from "./implementations/type";

export const modifiers = {
  [STATUS_MODIFIER]: statusModifier,
  [PRIORITY_MODIFIER]: priorityModifier,
  [TAG_MODIFIER]: tagModifier,
  [DESCRIPTION_MODIFIER]: descriptionModifier,
  [HELP_MODIFIER]: helpModifier,
  [ORDER_MODIFIER]: orderModifier,
  [TYPE_MODIFIER]: typeModifier,
} as const satisfies Record<string, CommandDefinition>;

export function getModifier(id: string): CommandDefinition | undefined {
  return modifiers[id as keyof typeof modifiers];
}

export function getAllModifiers(): CommandDefinition[] {
  return Object.values(modifiers);
}
