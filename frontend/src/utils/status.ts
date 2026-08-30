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

export const statusColorBg: Record<ItemStatus, string> = {
  TODO: "bg-bg-lighter",
  IN_PROGRESS: "bg-accent",
  DONE: "bg-done",
  CANCELED: "bg-fg-muted",
  ARCHIVED: "bg-fg-muted",
};

export const statusMapper: Record<ItemStatus, string> = {
  TODO: "TODO",
  IN_PROGRESS: "PROG",
  DONE: "DONE",
  CANCELED: "CANC",
  ARCHIVED: "ARCH",
};

export const priorityMapper: Record<ItemPriority, string> = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGT",
};

export const priorityColorBg: Record<ItemPriority, string> = {
  URGENT: "bg-urgent",
  HIGH: "bg-high",
  NORMAL: "bg-normal",
  LOW: "bg-low",
};
