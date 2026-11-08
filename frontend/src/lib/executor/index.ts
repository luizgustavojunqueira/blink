import { useUiStore } from "../../stores/ui.ts";
import { getCommand, isCommandAvailable } from "../commands/registry.ts";
import type { ExecuteResult } from "../commands/types.ts";
import type { ParsedCommand } from "../parser/index.ts";
import type { AppContext } from "../types.ts";
import { t } from "../i18n";

export async function execute(
  command: ParsedCommand,
  app: AppContext,
): Promise<ExecuteResult | void> {
  const def = getCommand(command.id);
  if (!def) return { message: t("Unknown command: {name}", { name: command.id }) };
  if (!isCommandAvailable(def, useUiStore.getState())) {
    return { message: t(":{name} isn't available here", { name: def.id }) };
  }
  if (!def.execute) return;

  return def.execute({ rawArgs: command.rawArgs, app });
}
