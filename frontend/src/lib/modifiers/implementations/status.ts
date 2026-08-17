import { Archived, Canceled, Done, InProgress, ToDo } from "../../../types/backend";
import { STATUS_MODIFIER } from "../delimiters";
import type { CommandDefinition } from "../../commands/types";
import { toPromptOption, type PromptOption } from "../../promptOptions";
import { VALID_STATUS } from "../../validator";
import { extractDelimited } from "../extract";

const STATUS_LIST: PromptOption[] = [
  {
    kind: "STATUS",
    name: "To Do",
    description: "Item is waiting to be started",
    value: ToDo,
  },
  {
    kind: "STATUS",
    name: "In Progress",
    description: "Item is currently being worked on",
    value: InProgress,
  },
  {
    kind: "STATUS",
    name: "Done",
    description: "Item has been completed",
    value: Done,
  },
  {
    kind: "STATUS",
    name: "Canceled",
    description: "Item was canceled",
    value: Canceled,
  },
  {
    kind: "STATUS",
    name: "Archived",
    description: "Item is archived",
    value: Archived,
  },
];

export const statusModifier: CommandDefinition = {
  id: STATUS_MODIFIER,
  displayName: STATUS_MODIFIER,
  description: "Filter by status",
  getOptions: (rawArgs) => {
    const filter = rawArgs.trim().toUpperCase();

    return STATUS_LIST.filter((t) => t.value.toUpperCase().includes(filter)).map((t) =>
      toPromptOption("STATUS", {
        name: t.name,
        description: t.description,
        value: t.value,
      }),
    );
  },
  extract: (raw) => extractDelimited(raw, STATUS_MODIFIER, VALID_STATUS),
};
