import { getCommand } from "../commands/registry.ts";
import type { ExecuteResult } from "../commands/types.ts";
import type { ParsedCommand } from "../parser/index.ts";
import { filter } from "./items.ts";

export async function execute(command: ParsedCommand): Promise<ExecuteResult | void> {
  if (command.type === "COMMAND") {
    const def = getCommand(command.id);
    if (!def) return { message: `Unknown command: ${command.id}` };

    return def.execute({ rawArgs: command.rawArgs });
  }

  await filter(command.data);
}
