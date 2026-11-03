import { ORDER_MODIFIER } from "../delimiters";
import type { CommandDefinition } from "../../commands/types";
import { toPromptOption, type PromptOption } from "../../promptOptions";
import { extractDelimited } from "../extract";
import {
  OrderCreated,
  OrderPriority,
  OrderStatus,
  OrderTitle,
  OrderUpdated,
  OrderDue,
} from "../../../types/backend";
import { VALID_ORDER_FIELDS } from "../../validator";

const BASE_ORDER_LIST: PromptOption[] = [
  {
    kind: "ORDER",
    name: "Title",
    description: "Order by title",
    value: OrderTitle,
  },
  {
    kind: "ORDER",
    name: "Status",
    description: "Order by status",
    value: OrderStatus,
  },
  {
    kind: "ORDER",
    name: "Priority",
    description: "Order by priority",
    value: OrderPriority,
  },
  {
    kind: "ORDER",
    name: "Created",
    description: "Order by created at",
    value: OrderCreated,
  },
  {
    kind: "ORDER",
    name: "Updated",
    description: "Order by updated at",
    value: OrderUpdated,
  },
  {
    kind: "ORDER",
    name: "Due",
    description: "Order by due date",
    value: OrderDue,
  },
];

const ORDER_LIST = [
  ...BASE_ORDER_LIST,
  ...BASE_ORDER_LIST.map((m) => ({
    ...m,
    name: `-${m.name}`,
    description: `${m.description} desc`,
    value: `-${m.value}`,
  })),
];

export const orderModifier: CommandDefinition = {
  id: ORDER_MODIFIER,
  displayName: ORDER_MODIFIER,
  description: "Order by",
  getOptions: (rawArgs) => {
    const filter = rawArgs.trim().toUpperCase();

    return ORDER_LIST.filter((t) => t.value.toUpperCase().includes(filter)).map((t) =>
      toPromptOption("ORDER", {
        name: t.name,
        description: t.description,
        value: t.value,
      }),
    );
  },
  extract: (raw) => extractDelimited(raw, ORDER_MODIFIER, VALID_ORDER_FIELDS),
};
