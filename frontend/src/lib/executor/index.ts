import type { Command } from "../parser/types";
import * as items from "./items.ts";

export async function execute(command: Command) {
  switch (command.type) {
    case "FILTER":
      return items.filter(command.data);
    default:
      break;
  }
}
