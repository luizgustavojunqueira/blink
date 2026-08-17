import { getCommand } from "../commands/registry.ts";
import type { ExecuteResult } from "../commands/types.ts";
import type { ParsedCommand } from "../parser/index.ts";

export async function execute(command: ParsedCommand): Promise<ExecuteResult | void> {
  const def = getCommand(command.id);
  if (!def) return { message: `Unknown command: ${command.id}` };
  if (!def.execute) return;

  return def.execute({ rawArgs: command.rawArgs });
}
