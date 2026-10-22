import { archiveCommand } from "./implementations/archive";
import { configCommand } from "./implementations/config";
import { createCommand } from "./implementations/create";
import { deleteCommand } from "./implementations/delete";
import { editCommand } from "./implementations/edit";
import { filterCommand } from "./implementations/filter";
import { groupCommand } from "./implementations/group";
import { moveCommand } from "./implementations/move";
import { themeCommand } from "./implementations/theme";
import type { UiState } from "../../stores/ui";
import { queryContext } from "../keymap/context";
import type { CommandDefinition } from "./types";

export const COMMAND_PREFIX = ":";

export const commands = {
  theme: themeCommand,
  filter: filterCommand,
  create: createCommand,
  edit: editCommand,
  group: groupCommand,
  delete: deleteCommand,
  move: moveCommand,
  archive: archiveCommand,
  config: configCommand,
} as const satisfies Record<string, CommandDefinition>;

export type CommandId = keyof typeof commands;

const commandsIndex: Record<string, CommandDefinition> = Object.values(commands).reduce(
  (acc, cmd) => {
    acc[cmd.id] = cmd;
    return acc;
  },
  {} as Record<string, CommandDefinition>,
);

export function getCommand(id: string): CommandDefinition | undefined {
  return commandsIndex[id];
}

export function getAllCommands(): CommandDefinition[] {
  return Object.values(commands);
}

export function isCommandAvailable(cmd: CommandDefinition, ui: UiState): boolean {
  if (!cmd.when) return true;
  const pane = ui.panes.find((p) => p.id === ui.activePaneId);
  return !!pane && cmd.when(queryContext(ui, pane));
}

export function modifiersFor(input: string): readonly string[] {
  const raw = input.trimStart();
  const id = raw.startsWith(COMMAND_PREFIX)
    ? raw.slice(COMMAND_PREFIX.length).split(/\s/, 1)[0].toLowerCase()
    : "";
  return (commandsIndex[id] ?? commands.filter).modifiers ?? [];
}
