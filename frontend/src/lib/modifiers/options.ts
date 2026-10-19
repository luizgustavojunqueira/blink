import { currentArgToken } from "../commands/argToken";
import type { PromptOption } from "../promptOptions";
import { HELP_MODIFIER } from "./delimiters";
import { helpOptions } from "./implementations/help";
import { getModifier } from "./registry";

export const modifierOptions =
  (allowed: readonly string[]) =>
  (rawArgs: string): PromptOption[] => {
    const current = currentArgToken(rawArgs).current;
    if (!allowed.includes(current[0])) return [];
    if (current[0] === HELP_MODIFIER) return helpOptions(allowed);

    const modifier = getModifier(current[0]);
    return modifier?.getOptions?.(current.slice(1)) ?? [];
  };
