import { PRIORITY_DELIMITER, STATUS_DELIMITER } from "../../lib/parser/types";
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
  type ItemPriority,
  type ItemStatus,
} from "../../types/backend";

type OptionType = "STATUS" | "PRIORITY" | "MODIFIER" | "NONE";
type OptionValueMap = {
  STATUS: ItemStatus;
  PRIORITY: ItemPriority;
  MODIFIER: string;
  NONE: never;
};

export type Option<T extends OptionType = OptionType> = {
  name: string;
  description: string;
  type: T;
  value: OptionValueMap[T];
};

export const optionsByType: {
  [K in OptionType]: Option<K>[];
} = {
  NONE: [],
  MODIFIER: [
    {
      name: "@",
      description: "Filter by status",
      type: "MODIFIER",
      value: "@",
    },
    {
      name: "!",
      description: "Filter by priority",
      type: "MODIFIER",
      value: "!",
    },
    {
      name: "#",
      description: "Filter by tag",
      type: "MODIFIER",
      value: "#",
    },
    {
      name: "$",
      description: "Description",
      type: "MODIFIER",
      value: "$",
    },
  ],
  STATUS: [
    {
      name: "To Do",
      description: "Item is waiting to be started",
      type: "STATUS",
      value: ToDo,
    },
    {
      name: "In Progress",
      description: "Item is currently being worked on",
      type: "STATUS",
      value: InProgress,
    },
    {
      name: "Done",
      description: "Item has been completed",
      type: "STATUS",
      value: Done,
    },
    {
      name: "Canceled",
      description: "Item was canceled",
      type: "STATUS",
      value: Canceled,
    },
    {
      name: "Archived",
      description: "Item is archived",
      type: "STATUS",
      value: Archived,
    },
  ],
  PRIORITY: [
    {
      name: "Low",
      description: "Low priority",
      type: "PRIORITY",
      value: Low,
    },
    {
      name: "Normal",
      description: "Normal priority",
      type: "PRIORITY",
      value: Normal,
    },
    {
      name: "High",
      description: "High priority",
      type: "PRIORITY",
      value: High,
    },
    {
      name: "Urgent",
      description: "Needs immediate attention",
      type: "PRIORITY",
      value: Urgent,
    },
  ],
};

export function getOptionType(char?: string): OptionType {
  if (!char) return "NONE";

  switch (char) {
    case STATUS_DELIMITER:
      return "STATUS";
    case PRIORITY_DELIMITER:
      return "PRIORITY";
    default:
      return "NONE";
  }
}
