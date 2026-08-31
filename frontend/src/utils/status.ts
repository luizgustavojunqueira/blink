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
  TODO: "bg-fg-dim/15 text-fg-dim border-fg-dim",
  IN_PROGRESS: "bg-accent/20 text-accent border-accent",
  DONE: "bg-done/20 text-done border-done",
  CANCELED: "bg-fg-muted/20 text-fg-muted border-fg-muted",
  ARCHIVED: "bg-fg-muted/20 text-fg-muted border-fg-muted",
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
  URGENT: "bg-urgent/20 text-urgent border-urgent",
  HIGH: "bg-high/20 text-high border-high",
  NORMAL: "bg-normal/20 text-normal border-normal",
  LOW: "bg-low/20 text-low border-low",
};
