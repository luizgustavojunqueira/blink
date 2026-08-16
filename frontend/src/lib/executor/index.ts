import type { Command } from "../parser/types";
import * as items from "./items.ts";
import * as theme from "./theme.ts";

export type ExecuteResult = {
  shouldClearPrompt: boolean;
};

export async function execute(command: Command): Promise<ExecuteResult | void> {
  switch (command.type) {
    case "FILTER":
      return items.filter(command.data);
    case "THEME":
      await theme.set(command.data);
      return { shouldClearPrompt: true };
    default:
      break;
  }
}
