import { COMMAND_PREFIX, getCommand } from "../commands/registry";

export type ParsedCommand = {
  id: string;
  rawArgs: string;
};

export function parse(input: string): ParsedCommand {
  const raw = input.trim();

  if (raw.startsWith(COMMAND_PREFIX)) {
    const spaceIndex = raw.indexOf(" ");
    const cmdPart = spaceIndex === -1 ? raw : raw.slice(0, spaceIndex);
    const id = cmdPart.slice(COMMAND_PREFIX.length).toLowerCase();

    if (getCommand(id)) {
      return {
        id,
        rawArgs: spaceIndex === -1 ? "" : raw.slice(spaceIndex + 1),
      };
    }
  }

  return { id: "filter", rawArgs: raw };
}
