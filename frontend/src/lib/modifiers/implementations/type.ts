import { Group, Task } from "../../../types/backend";
import { TYPE_MODIFIER } from "../delimiters";
import type { CommandDefinition } from "../../commands/types";
import { toPromptOption, type PromptOption } from "../../promptOptions";
import { VALID_TYPE } from "../../validator";
import { extractDelimited } from "../extract";

const TYPE_LIST: PromptOption[] = [
  { kind: "TYPE", name: "Task", description: "A Task", value: Task },
  {
    kind: "TYPE",
    name: "Group",
    description: "A Group of Tasks",
    value: Group,
  },
];

export const typeModifier: CommandDefinition = {
  id: TYPE_MODIFIER,
  displayName: TYPE_MODIFIER,
  description: "Filter by type",
  getOptions: (rawArgs) => {
    const filter = rawArgs.trim().toUpperCase();

    return TYPE_LIST.filter((t) => t.value.toUpperCase().includes(filter)).map((t) =>
      toPromptOption("TYPE", {
        name: t.name,
        description: t.description,
        value: t.value,
      }),
    );
  },
  extract: (raw) => extractDelimited(raw, TYPE_MODIFIER, VALID_TYPE),
};
