import { type GetItemRequest } from "../../types/backend";
import { VALID_PRIORITY, VALID_STATUS } from "../validator";
import {
  DESCRIPTION_DELIMITER,
  PRIORITY_DELIMITER,
  STATUS_DELIMITER,
  TAG_DELIMITER,
  type Command,
} from "./types";

export function parse(input: string): Command {
  const raw = input.trim();
  if (!raw) {
    return { type: "FILTER", data: {} };
  }

  return { type: "FILTER", data: parseFilter(raw) };
}

const regexModifier = (delimiter: string) =>
  new RegExp(`\\${delimiter}(\\S+)`, "g");

function extractAll(text: string, delimiter: string): string[] {
  const regex = regexModifier(delimiter);
  const matches = [...text.matchAll(regex)];
  return matches.map((m) => m[1].toLowerCase());
}

function parseFilter(raw: string): GetItemRequest {
  const tags = extractAll(raw, TAG_DELIMITER);
  const status = extractAll(raw, STATUS_DELIMITER).filter((s) =>
    VALID_STATUS.has(s),
  );

  const priority = extractAll(raw, PRIORITY_DELIMITER).filter((p) =>
    VALID_PRIORITY.has(p),
  );

  let clean = raw
    .replace(regexModifier(TAG_DELIMITER), "")
    .replace(regexModifier(STATUS_DELIMITER), "")
    .replace(regexModifier(PRIORITY_DELIMITER), "")
    .replace(/\s+/g, " ")
    .trim();

  let title: string | undefined;
  let description: string | undefined;

  const descStartIndex = clean.indexOf(DESCRIPTION_DELIMITER);
  if (descStartIndex === -1) {
    title = clean || undefined;
  } else {
    title = clean.slice(0, descStartIndex).trim() || undefined;
    description = clean.slice(descStartIndex + 1).trim() || undefined;
  }

  return {
    title,
    description,
    tags: tags.length ? tags : undefined,
    priority: priority.length ? priority : undefined,
    status: status.length ? status : undefined,
  };
}
