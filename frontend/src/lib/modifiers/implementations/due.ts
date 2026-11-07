import type { CommandDefinition } from "../../commands/types";
import { toPromptOption } from "../../promptOptions";
import { describeDue, dueKeywords, parseDue } from "../../dates/due";
import { DUE_MODIFIER } from "../delimiters";
import { t } from "../../i18n";

const DUE_REGEX = new RegExp(`\\${DUE_MODIFIER}(\\S+)`, "g");

export function extractDue(raw: string) {
  const found = [...raw.matchAll(DUE_REGEX)].map((m) => m[1]);
  const values: string[] = [];
  const invalid: string[] = [];

  for (const word of found) {
    const date = parseDue(word);
    if (date === null) invalid.push(word);
    else values.push(date);
  }

  return { values, invalid, remaining: raw.replace(DUE_REGEX, "").replace(/\s+/g, " ").trim() };
}

export function singleDue(
  values: string[],
  invalid: string[],
): { ok: true; value: string | undefined } | { ok: false; error: string } {
  if (invalid.length > 0) return { ok: false, error: t('Invalid due date "{value}"', { value: invalid[0] }) };
  if (values.length > 1) return { ok: false, error: t("An item can only have one due date") };
  return { ok: true, value: values[0] };
}

export const dueModifier: CommandDefinition = {
  id: DUE_MODIFIER,
  displayName: DUE_MODIFIER,
  description: "Due date (today, fri, +3, 26/11, 31/12/26)",
  getOptions: (rawArgs) => {
    const typed = rawArgs.trim().toLowerCase();
    const keywords = dueKeywords().filter((k) => k.startsWith(typed));
    const options = keywords.map((keyword) =>
      toPromptOption("DUE", {
        name: keyword,
        description: parseDue(keyword) === "" ? t("No due date") : describeDue(parseDue(keyword) ?? ""),
        value: keyword,
      }),
    );
    if (options.length > 0 || !typed) return options;

    const date = parseDue(typed);
    return date
      ? [toPromptOption("DUE", { name: typed, description: date ? describeDue(date) : t("No due date"), value: typed })]
      : [];
  },
  extract: extractDue,
};
