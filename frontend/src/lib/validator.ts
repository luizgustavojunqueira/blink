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
  OrderTitle,
  OrderUpdated,
  OrderCreated,
  OrderPriority,
  OrderStatus,
  OrderDue,
  Task,
  Group,
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

export const ORDER_FIELD_CLASS: Record<string, string> = {
  [OrderTitle]: "text-fg",
  [OrderUpdated]: "text-normal",
  [OrderCreated]: "text-low",
  [OrderPriority]: "text-high",
  [OrderStatus]: "text-status",
  [OrderDue]: "text-accent",
};

export const TYPE_CLASS: Record<string, string> = {
  [Group.toLowerCase()]: "text-group",
  [Task.toLowerCase()]: "text-task",
};

export const VALID_STATUS = Object.keys(STATUS_CLASS);
export const VALID_PRIORITY = Object.keys(PRIORITY_CLASS);
export const VALID_ORDER_FIELDS = [
  ...Object.keys(ORDER_FIELD_CLASS),
  ...Object.keys(ORDER_FIELD_CLASS).map((f) => `-${f}`),
];
export const VALID_TYPE = Object.keys(TYPE_CLASS);
