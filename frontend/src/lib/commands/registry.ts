import { filterCommand } from "./implementations/filter";
import { themeCommand } from "./implementations/theme";
import type { CommandDefinition } from "./types"

export const COMMAND_PREFIX = "/"

export const commands = {
  theme: themeCommand,
  filter: filterCommand,
} as const satisfies Record<string, CommandDefinition>;

export type CommandId = keyof typeof commands;

const commandsIndex: Record<string, CommandDefinition> = Object.values(commands).reduce((acc, cmd) => {
  acc[cmd.id] = cmd;
  return acc
}, {} as Record<string, CommandDefinition>)

export function getCommand(id: string): CommandDefinition | undefined {
  return commandsIndex[id]
}

export function getAllCommands(): CommandDefinition[]{
  return Object.values(commands)
}
