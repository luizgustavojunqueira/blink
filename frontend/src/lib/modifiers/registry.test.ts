import { describe, expect, it } from "vitest";
import { getAllModifiers, getModifier } from "./registry";

describe("modifiers registry", () => {
  it("registers $ as a rest-kind modifier", () => {
    expect(getModifier("$")?.extractKind).toBe("rest");
  });

  it("returns undefined for an unknown delimiter", () => {
    expect(getModifier("x")).toBeUndefined();
    expect(getModifier(undefined as unknown as string)).toBeUndefined();
  });

  it("exposes every registered modifier under its own delimiter", () => {
    for (const modifier of getAllModifiers()) {
      expect(getModifier(modifier.id)).toBe(modifier);
    }
  });

  it("registers no delimiter twice", () => {
    const ids = getAllModifiers().map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
