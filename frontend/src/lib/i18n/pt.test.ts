import { describe, expect, it } from "vitest";
import { pt } from "./pt";
import { getAllCommands } from "../commands/registry";
import { getAllModifiers } from "../modifiers/registry";
import { keyBindings } from "../keymap/registry";
import { DETAIL_FIELDS } from "../pane/types";
import { ANIMATION_SETTINGS } from "../motion";
import { DUE_MODIFIER } from "../modifiers/delimiters";

const CALL = /\bt\(\s*(["'])((?:\\.|(?!\1).)*)\1/g;

const sources = import.meta.glob(["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}", "!/src/test/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const literalKeys = () =>
  Object.values(sources).flatMap((code) =>
    [...code.matchAll(CALL)].map((m) => m[2].replace(/\\(["'\\])/g, "$1")),
  );

const definitionKeys = () => [
  ...getAllCommands().map((c) => c.description),
  ...getAllModifiers().flatMap((m) => [
    m.description,
    ...(m.id === DUE_MODIFIER ? [] : (m.getOptions?.("") ?? []).map((o) => o.description)),
  ]),
  ...keyBindings.flatMap((b) => [b.description, b.hint?.group ?? "misc", b.scope]),
];

const valueKeys = [
  ...DETAIL_FIELDS.filter((f) => f !== "due_date"),
  ...ANIMATION_SETTINGS,
  "created",
  "deleted",
  "restored",
  "parent",
  "due",
  "log in",
  "enter to log in",
  "no account? create one",
  "create account",
  "enter to create the account",
  "have an account? log in",
  "comma between alternatives, space for a sequence: j, ctrl+d, g g · empty resets",
  "hex color, e.g. #282828",
  "a-z, 0-9 and dashes",
];

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("portuguese dictionary", () => {
  const keys = [...new Set([...literalKeys(), ...definitionKeys(), ...valueKeys])].filter((k) => k !== "" && !/^[A-Z]+$/.test(k));

  it("finds the strings to translate", () => {
    expect(keys.length).toBeGreaterThan(150);
  });

  it("translates every string the interface shows", () => {
    expect(keys.filter((k) => !(k in pt))).toEqual([]);
  });

  it("keeps every placeholder of the english text", () => {
    const broken = Object.entries(pt).filter(([en, text]) => placeholders(en).join() !== placeholders(text).join());
    expect(broken).toEqual([]);
  });

  it("has no translation for text that no longer exists", () => {
    const known = new Set(keys);
    expect(Object.keys(pt).filter((k) => !known.has(k) && !k.startsWith("api."))).toEqual([]);
  });
});
