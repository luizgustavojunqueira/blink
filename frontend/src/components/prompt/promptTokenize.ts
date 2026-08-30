import {
  PRIORITY_MODIFIER,
  TAG_MODIFIER,
  STATUS_MODIFIER,
  DESCRIPTION_MODIFIER,
} from "../../lib/modifiers/delimiters.ts";
import { PRIORITY_CLASS, STATUS_CLASS } from "../../lib/validator";
import type { Token } from "../textField/textOverlay";

export function tokenizePrompt(text: string): Token[] {
  const regex = new RegExp(
    `([\\${PRIORITY_MODIFIER}\\${TAG_MODIFIER}\\${STATUS_MODIFIER}]\\S+|\\${DESCRIPTION_MODIFIER})`,
    "g",
  );
  const parts = text.split(regex);
  const tokens: Token[] = [];
  let isDescription = false;

  for (const part of parts) {
    if (!part) continue;

    if (part === DESCRIPTION_MODIFIER) {
      isDescription = true;
      tokens.push({ text: part, className: "text-accent font-medium" });
      continue;
    }

    if (part.startsWith(PRIORITY_MODIFIER) || part.startsWith(STATUS_MODIFIER)) {
      const value = part.slice(1).toLowerCase();

      if (!value) {
        tokens.push({ text: part, className: "text-accent font-medium" });
        continue;
      }

      const colorClass = part.startsWith(PRIORITY_MODIFIER)
        ? PRIORITY_CLASS[value]
        : STATUS_CLASS[value];

      tokens.push({
        text: part,
        className: colorClass ? `${colorClass} font-medium` : "text-danger line-through font-bold",
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
