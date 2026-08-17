import { describe, expect, it } from "vitest";
import { getAllModifiers, getModifier } from "./registry";

describe("modifiers registry", () => {
  it("resolves each registered delimiter", () => {
    expect(getModifier("@")?.id).toBe("@");
    expect(getModifier("!")?.id).toBe("!");
    expect(getModifier("#")?.id).toBe("#");
    expect(getModifier("?")?.id).toBe("?");
  });

  it("does not register $ as a modifier (it's discoverable via ? only)", () => {
    expect(getModifier("$")).toBeUndefined();
  });

  it("returns undefined for an unknown delimiter", () => {
    expect(getModifier("x")).toBeUndefined();
    expect(getModifier(undefined as unknown as string)).toBeUndefined();
  });

  it("lists every registered modifier", () => {
    const ids = getAllModifiers().map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(["@", "!", "#", "?"]));
    expect(ids).toHaveLength(4);
  });
});
