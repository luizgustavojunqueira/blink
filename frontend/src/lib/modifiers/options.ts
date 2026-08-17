import { currentArgToken } from "../commands/argToken";
import type { PromptOption } from "../promptOptions";
import { getModifier } from "./registry";

export function modifierOptions(rawArgs: string): PromptOption[] {
  const current = currentArgToken(rawArgs).current;
  const modifier = getModifier(current[0]);

  return modifier?.getOptions?.(current.slice(1)) ?? [];
}
