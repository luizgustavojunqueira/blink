import { TAG_MODIFIER } from "../modifiers/delimiters";

const REPEATED_MARKER = new RegExp(`\\${TAG_MODIFIER}{2,}`, "g");

export function normalizeTagText(text: string): string {
  return text.replace(REPEATED_MARKER, TAG_MODIFIER);
}
