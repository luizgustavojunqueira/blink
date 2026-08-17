import { getAllModifiers } from "./registry";

export type ModifierValues = Record<string, string[]>;

export type ParsedModifiers = {
  text: string;
  values: ModifierValues;
  invalid: ModifierValues;
};

export function parseModifiers(raw: string): ParsedModifiers {
  const extractors = getAllModifiers().filter((m) => m.extract);

  const ordered = [
    ...extractors.filter((m) => (m.extractKind ?? "token") === "token"),
    ...extractors.filter((m) => m.extractKind === "rest"),
  ];

  const values: ModifierValues = {};
  const invalid: ModifierValues = {};
  let text = raw;

  for (const modifier of ordered) {
    const result = modifier.extract!(text);
    values[modifier.id] = result.values;
    invalid[modifier.id] = result.invalid;
    text = result.remaining;
  }

  return { text: text.trim(), values, invalid };
}
