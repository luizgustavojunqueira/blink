import { PRIORITY_DELIMITER, STATUS_DELIMITER } from "../../lib/parser/types";
import type { PromptOption } from "../../lib/promptOptions";
import {
  Archived,
  Canceled,
  Done,
  High,
  InProgress,
  Low,
  Normal,
  ToDo,
  Urgent,
} from "../../types/backend";

export const MODIFIER_OPTIONS: PromptOption[] = [
  { kind: "MODIFIER", name: "@", description: "Filter by status", value: "@" },
  { kind: "MODIFIER", name: "!", description: "Filter by priority", value: "!" },
  { kind: "MODIFIER", name: "#", description: "Filter by tag", value: "#" },
  { kind: "MODIFIER", name: "$", description: "Description", value: "$" },
];

export const optionsByType: Record<"STATUS" | "PRIORITY", PromptOption[]> = {
  STATUS: [
    { kind: "STATUS", name: "To Do", description: "Item is waiting to be started", value: ToDo },
    { kind: "STATUS", name: "In Progress", description: "Item is currently being worked on", value: InProgress },
    { kind: "STATUS", name: "Done", description: "Item has been completed", value: Done },
    { kind: "STATUS", name: "Canceled", description: "Item was canceled", value: Canceled },
    { kind: "STATUS", name: "Archived", description: "Item is archived", value: Archived },
  ],
  PRIORITY: [
    { kind: "PRIORITY", name: "Low", description: "Low priority", value: Low },
    { kind: "PRIORITY", name: "Normal", description: "Normal priority", value: Normal },
    { kind: "PRIORITY", name: "High", description: "High priority", value: High },
    { kind: "PRIORITY", name: "Urgent", description: "Needs immediate attention", value: Urgent },
  ],
};

export function getOptionType(char?: string): "STATUS" | "PRIORITY" | null {
  switch (char) {
    case STATUS_DELIMITER:
      return "STATUS";
    case PRIORITY_DELIMITER:
      return "PRIORITY";
    default:
      return null;
  }
}
