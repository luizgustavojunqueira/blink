import {
  ToDo,
  InProgress,
  Done,
  Canceled,
  Archived,
  Low,
  Normal,
  High,
  Urgent,
} from "../types/backend";

export const STATUS_CLASS: Record<string, string> = {
  [ToDo.toLowerCase()]: "text-fg-dim",
  [InProgress.toLowerCase()]: "text-accent",
  [Done.toLowerCase()]: "text-done",
  [Canceled.toLowerCase()]: "text-fg-muted",
  [Archived.toLowerCase()]: "text-fg-muted",
};

export const PRIORITY_CLASS: Record<string, string> = {
  [Low.toLowerCase()]: "text-low",
  [Normal.toLowerCase()]: "text-normal",
  [High.toLowerCase()]: "text-high",
  [Urgent.toLowerCase()]: "text-urgent",
};

export const VALID_STATUS = new Set(Object.keys(STATUS_CLASS));
export const VALID_PRIORITY = new Set(Object.keys(PRIORITY_CLASS));
