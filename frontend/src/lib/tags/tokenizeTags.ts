import { TAG_MODIFIER } from "../modifiers/delimiters";
import type { Token } from "../../components/textField/textOverlay";

const TAG_REGEX = new RegExp(`(\\${TAG_MODIFIER}\\S+)`, "g");

export function tokenizeTags(text: string): Token[] {
  const parts = text.split(TAG_REGEX);
  const tokens: Token[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith(TAG_MODIFIER)) {
      tokens.push({ text: part, className: "text-tag font-medium" });
      continue;
    }

    tokens.push({
      text: part,
      className: /^\s*$/.test(part) ? "" : "text-danger line-through",
    });
  }

  return tokens;
}
