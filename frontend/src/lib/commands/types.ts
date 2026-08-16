import type { PromptOption } from "../promptOptions";

export type ExecuteResult = {
  shouldClearPrompt?: boolean;
  message?: string;
};

export type CommandContext = {
  rawArgs: string;
}

export type CommandDefinition = {
  id: string;
  displayName: string;
  description: string;

  getOptions?: (rawArgs: string) => PromptOption[];
  execute: (context: CommandContext) => Promise<ExecuteResult | void> | ExecuteResult | void;
}


