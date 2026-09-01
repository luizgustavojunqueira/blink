import type { PromptOption } from "../promptOptions";
import type { AppContext } from "../types";

export type ExecuteResult = {
  shouldClearPrompt?: boolean;
  message?: string;
};

export type CommandContext = {
  rawArgs: string;
  app: AppContext;
};

export type CommandDefinition<TOptions = any> = {
  id: string;
  displayName: string;
  description: string;

  getOptions?: (rawArgs: string, options?: TOptions) => PromptOption[];
  execute?: (context: CommandContext) => Promise<ExecuteResult | void> | ExecuteResult | void;
  extract?: (raw: string) => {
    values: string[];
    invalid: string[];
    remaining: string;
  };
  extractKind?: "token" | "rest";

  /**
   * How many positional argument slots this command has (default 1).
   * Used to decide how much text a selected COMMAND_ARG option replaces:
   * everything after the last confirmed argument, not just the last word.
   */
  argCount?: number;

  /**
   * Whether the current word must be exactly 1 space away from the previous
   * token for `getOptions` to be consulted (default true). Commands whose
   * args are positional (e.g. /theme <name>) want this. Commands whose args
   * are free text with inline tokens anywhere (e.g. /filter, which just
   * delegates to the modifier registry) should set this to false.
   */
  strictArgPosition?: boolean;
};
