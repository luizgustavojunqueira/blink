import type { GetItemRequest } from "../../types/backend";

type CommandMap = {
  FILTER: GetItemRequest;
  THEME: { theme: string };
};

export const CommandType = {
  FILTER: "FILTER",
  THEME: "THEME",
} satisfies Record<keyof CommandMap, keyof CommandMap>;

export type Command = {
  [K in keyof CommandMap]: { type: K; data: CommandMap[K] };
}[keyof CommandMap];

export const PRIORITY_DELIMITER = "!";
export const TAG_DELIMITER = "#";
export const STATUS_DELIMITER = "@";
export const DESCRIPTION_DELIMITER = "$";
