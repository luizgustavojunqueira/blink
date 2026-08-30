import type { ItemPriority, ItemStatus } from "../types/backend";

export const priorityColor: Record<ItemPriority, string> = {
  URGENT: "text-urgent",
  HIGH: "text-high",
  NORMAL: "text-normal",
  LOW: "text-low",
};

export const statusColor: Record<ItemStatus, string> = {
  TODO: "text-fg-dim",
  IN_PROGRESS: "text-accent",
  DONE: "text-done",
  CANCELED: "text-fg-muted",
  ARCHIVED: "text-fg-muted",
};

export const statusMapper: Record<ItemStatus, string> = {
  TODO: "TODO",
  IN_PROGRESS: "PROG",
  DONE: "DONE",
  CANCELED: "CANC",
  ARCHIVED: "ARCH",
};

export const priorityMapper: Record<ItemPriority, string> = {
  URGENT: "URGT",
  HIGH: "HIGH",
  NORMAL: "",
  LOW: "LOW",
};
