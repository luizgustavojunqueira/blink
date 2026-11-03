import {
  PRIORITY_MODIFIER,
  TAG_MODIFIER,
  STATUS_MODIFIER,
  DESCRIPTION_MODIFIER,
  ORDER_MODIFIER,
  TYPE_MODIFIER,
  DUE_MODIFIER,
} from "../../lib/modifiers/delimiters.ts";
import { parseDue } from "../../lib/dates/due";
import { modifiersFor } from "../../lib/commands/registry";
import { ORDER_FIELD_CLASS, PRIORITY_CLASS, STATUS_CLASS, TYPE_CLASS } from "../../lib/validator";
import type { Token } from "../textField/textOverlay";

const MODIFIER_CHARS = new Set([
  PRIORITY_MODIFIER,
  TAG_MODIFIER,
  STATUS_MODIFIER,
  DESCRIPTION_MODIFIER,
  ORDER_MODIFIER,
  TYPE_MODIFIER,
  DUE_MODIFIER,
]);

export function tokenizePrompt(text: string): Token[] {
  const allowed = new Set(modifiersFor(text));
  const regex = new RegExp(
    `([\\${PRIORITY_MODIFIER}\\${TAG_MODIFIER}\\${STATUS_MODIFIER}\\${ORDER_MODIFIER}\\${TYPE_MODIFIER}\\${DUE_MODIFIER}]\\S+|\\${DESCRIPTION_MODIFIER})`,
    "g",
  );
  const parts = text.split(regex);
  const tokens: Token[] = [];
  let isDescription = false;

  for (const part of parts) {
    if (!part) continue;

    if (MODIFIER_CHARS.has(part[0]) && !allowed.has(part[0])) {
      tokens.push({ text: part, className: isDescription ? "text-fg-dim" : "" });
      continue;
    }

    if (part === DESCRIPTION_MODIFIER) {
      isDescription = true;
      tokens.push({ text: part, className: "text-accent font-medium" });
      continue;
    }

    if (
      part.startsWith(PRIORITY_MODIFIER) ||
      part.startsWith(STATUS_MODIFIER) ||
      part.startsWith(ORDER_MODIFIER) ||
      part.startsWith(TYPE_MODIFIER)
    ) {
      const value = part.slice(1).toLowerCase();

      if (!value) {
        tokens.push({ text: part, className: "text-accent font-medium" });
        continue;
      }

      let colorClass = "";

      switch (part[0]) {
        case PRIORITY_MODIFIER:
          colorClass = PRIORITY_CLASS[value];
          break;
        case STATUS_MODIFIER:
          colorClass = STATUS_CLASS[value];
          break;
        case ORDER_MODIFIER:
          colorClass = ORDER_FIELD_CLASS[value.startsWith("-") ? value.slice(1) : value];
          break;
        case TYPE_MODIFIER:
          colorClass = TYPE_CLASS[value];
          break;
      }

      tokens.push({
        text: part,
        className: colorClass ? `${colorClass} font-medium` : "text-danger line-through font-bold",
      });
      continue;
    }

    if (part.startsWith(DUE_MODIFIER)) {
      const valid = part.length > 1 && parseDue(part.slice(1)) !== null;
      tokens.push({
        text: part,
        className: part.length === 1 || valid ? "text-accent font-medium" : "text-danger line-through font-bold",
      });
      continue;
    }

    if (part.startsWith(TAG_MODIFIER)) {
      tokens.push({ text: part, className: "text-tag font-medium" });
      continue;
    }

    tokens.push({ text: part, className: isDescription ? "text-fg-dim" : "" });
  }

  return tokens;
}
