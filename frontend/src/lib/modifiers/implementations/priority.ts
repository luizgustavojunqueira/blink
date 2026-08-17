import {
  High,
  Low,
  Normal,
  Urgent,
} from "../../../types/backend";
import { PRIORITY_MODIFIER } from "../delimiters";
import type { CommandDefinition } from "../../commands/types";
import { toPromptOption, type PromptOption } from "../../promptOptions";
import { VALID_PRIORITY } from "../../validator";
import { extractDelimited } from "../extract";

const PRIORITY_LIST: PromptOption[] = [
  { kind: "PRIORITY", name: "Low", description: "Low priority", value: Low },
  {
    kind: "PRIORITY",
    name: "Normal",
    description: "Normal priority",
    value: Normal,
  },
  { kind: "PRIORITY", name: "High", description: "High priority", value: High },
  {
    kind: "PRIORITY",
    name: "Urgent",
    description: "Needs immediate attention",
    value: Urgent,
  },
];

export const priorityModifier: CommandDefinition = {
  id: PRIORITY_MODIFIER,
  displayName: PRIORITY_MODIFIER,
  description: "Filter by priority",
  getOptions: (rawArgs) => {
    const filter = rawArgs.trim().toUpperCase();

    return PRIORITY_LIST.filter((t) => t.value.toUpperCase().includes(filter)).map((t) =>
      toPromptOption("PRIORITY", {
        name: t.name,
        description: t.description,
        value: t.value,
      }),
    );
  },
  extract: (raw) => extractDelimited(raw, PRIORITY_MODIFIER, VALID_PRIORITY),
};
