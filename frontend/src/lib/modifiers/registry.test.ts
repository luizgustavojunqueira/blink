import { describe, expect, it } from "vitest";
import { getAllModifiers, getModifier } from "./registry";

describe("modifiers registry", () => {
  it("resolves each registered delimiter", () => {
    expect(getModifier("@")?.id).toBe("@");
    expect(getModifier("!")?.id).toBe("!");
    expect(getModifier("#")?.id).toBe("#");
    expect(getModifier("?")?.id).toBe("?");
    expect(getModifier("$")?.id).toBe("$");
  });

  it("registers $ as a rest-kind modifier", () => {
    expect(getModifier("$")?.extractKind).toBe("rest");
  });

  it("returns undefined for an unknown delimiter", () => {
    expect(getModifier("x")).toBeUndefined();
    expect(getModifier(undefined as unknown as string)).toBeUndefined();
  });

  it("lists every registered modifier", () => {
    const ids = getAllModifiers().map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(["@", "!", "#", "$", "?"]));
    expect(ids).toHaveLength(5);
  });
});
