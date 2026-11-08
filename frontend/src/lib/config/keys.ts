import { keyBindings, type Keymap } from "../keymap/registry";
import type { KeyBinding } from "../keymap/types";
import { t } from "../i18n";

const MODIFIERS = ["ctrl", "alt", "meta", "shift"] as const;

const NAMED_KEYS = new Set([
  "escape",
  "enter",
  "tab",
  "backspace",
  "delete",
  "insert",
  "space",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "home",
  "end",
  "pageup",
  "pagedown",
  ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`),
]);

const ALIASES: Record<string, string> = {
  esc: "escape",
  return: "enter",
  del: "delete",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  pgup: "pageup",
  pgdn: "pagedown",
};

const MAX_ALTERNATIVES = 5;
const MAX_SEQUENCE = 3;

export type ParsedKeys = { keys: string[] } | { error: string };

function parseToken(raw: string): { key: string } | { error: string } {
  const match = /^((?:[a-z]+\+)*)(.+)$/i.exec(raw);
  if (!match) return { error: t('"{key}" is not a key', { key: raw }) };

  const mods = match[1]
    .split("+")
    .filter(Boolean)
    .map((m) => m.toLowerCase());
  let key = match[2];

  for (const m of mods) {
    if (!(MODIFIERS as readonly string[]).includes(m)) {
      return {
        error: t('"{key}" is not a modifier, use ctrl, alt, meta or shift', { key: m }),
      };
    }
  }
  if (new Set(mods).size !== mods.length)
    return { error: t('"{key}" repeats a modifier', { key: raw }) };

  if (key.length > 1) {
    const lower = key.toLowerCase();
    key = ALIASES[lower] ?? lower;
    if (!NAMED_KEYS.has(key)) return { error: t('"{key}" is not a key', { key: match[2] }) };
  } else if (mods.includes("shift")) {
    return {
      error: t('write the character itself instead of "{key}" (e.g. G, not shift+g)', { key: raw }),
    };
  }

  const ordered = MODIFIERS.filter((m) => mods.includes(m));
  return { key: [...ordered, key].join("+") };
}

export function parseKeys(input: string): ParsedKeys {
  const keys: string[] = [];

  for (const alternative of input.split(",")) {
    const tokens = alternative.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    if (tokens.length > MAX_SEQUENCE) {
      return { error: t("a sequence can have at most {count} keys", { count: MAX_SEQUENCE }) };
    }

    const seq: string[] = [];
    for (const token of tokens) {
      const parsed = parseToken(token);
      if ("error" in parsed) return parsed;
      seq.push(parsed.key);
    }

    const joined = seq.join(" ");
    if (!keys.includes(joined)) keys.push(joined);
  }

  if (keys.length > MAX_ALTERNATIVES) {
    return { error: t("at most {count} alternatives", { count: MAX_ALTERNATIVES }) };
  }

  return { keys };
}

const isPrefixOf = (a: string, b: string) => b.startsWith(`${a} `);

const overlaps = (a: string, b: string) =>
  a === b || isPrefixOf(a, b) || isPrefixOf(b, a);

const sameContext = (a: KeyBinding, b: KeyBinding) =>
  a.modes.some((m) => b.modes.includes(m)) &&
  (a.scope === "global" || b.scope === "global" || a.scope === b.scope);

const designedToShare = (a: KeyBinding, b: KeyBinding) =>
  a.keys.some((k) => b.keys.includes(k));

export const effectiveKeys = (binding: KeyBinding, keymap: Keymap) =>
  (!binding.fixed && keymap[binding.id]) || binding.keys;

export type Conflict = { key: string; binding: KeyBinding };

export function findConflict(
  bindingId: string,
  keys: string[],
  keymap: Keymap,
): Conflict | null {
  const target = keyBindings.find((b) => b.id === bindingId);
  if (!target) return null;

  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < keys.length; j++) {
      if (i !== j && isPrefixOf(keys[i], keys[j]))
        return { key: keys[i], binding: target };
    }
  }

  for (const other of keyBindings) {
    if (
      other === target ||
      !sameContext(target, other) ||
      designedToShare(target, other)
    ) {
      continue;
    }
    for (const theirs of effectiveKeys(other, keymap)) {
      const mine = keys.find((k) => overlaps(k, theirs));
      if (mine) return { key: mine, binding: other };
    }
  }

  return null;
}

export function isValidKeymapEntry(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((v) => typeof v === "string")) return false;
  const parsed = parseKeys(value.join(","));
  return (
    "keys" in parsed &&
    parsed.keys.length === value.length &&
    parsed.keys.every((k, i) => k === value[i])
  );
}
