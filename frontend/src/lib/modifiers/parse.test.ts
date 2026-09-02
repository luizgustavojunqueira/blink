import { describe, expect, it } from "vitest";
import { parseModifiers } from "./parse";

describe("parseModifiers()", () => {
  it("returns the input as text when there is no modifier", () => {
    const { text, values } = parseModifiers("build blink");

    expect(text).toBe("build blink");
    expect(values["#"]).toEqual([]);
    expect(values["$"]).toEqual([]);
  });

  it("collects token modifiers regardless of position", () => {
    const { text, values } = parseModifiers("title !high @todo #dev is #golang here");

    expect(text).toBe("title is here");
    expect(values["!"]).toEqual(["high"]);
    expect(values["@"]).toEqual(["todo"]);
    expect(values["#"]).toEqual(["dev", "golang"]);
  });

  it("keeps every occurrence of a repeated modifier, in order", () => {
    expect(parseModifiers("t @done @todo").values["@"]).toEqual(["done", "todo"]);
  });

  it("drops values outside the modifier's valid set", () => {
    const { values } = parseModifiers("title @banana @todo !nope !high");

    expect(values["@"]).toEqual(["todo"]);
    expect(values["!"]).toEqual(["high"]);
  });

  it("reports rejected values instead of swallowing them", () => {
    const { invalid } = parseModifiers("title @banana @todo !nope");

    expect(invalid["@"]).toEqual(["banana"]);
    expect(invalid["!"]).toEqual(["nope"]);
  });

  it("reports nothing as invalid for modifiers with no valid set", () => {
    expect(parseModifiers("title #anything").invalid["#"]).toEqual([]);
  });

  it("takes everything after $ as a single description value", () => {
    const { text, values } = parseModifiers("title $ and the description");

    expect(text).toBe("title");
    expect(values["$"]).toEqual(["and the description"]);
  });

  it("preserves case in the description, unlike token values", () => {
    expect(parseModifiers("t $ Ship It Today").values["$"]).toEqual(["Ship It Today"]);
  });

  it("runs token extractors before the rest extractor, so tags after $ still count", () => {
    const { text, values } = parseModifiers("title #dev $ describe #golang it !high");

    expect(text).toBe("title");
    expect(values["#"]).toEqual(["dev", "golang"]);
    expect(values["!"]).toEqual(["high"]);
    expect(values["$"]).toEqual(["describe it"]);
  });

  it("ignores bare delimiters with no value attached", () => {
    const { text, values } = parseModifiers("title @ ! #");

    expect(text).toBe("title @ ! #");
    expect(values["@"]).toEqual([]);
  });

  it("yields no description for a trailing bare $", () => {
    const { text, values } = parseModifiers("title $");

    expect(text).toBe("title");
    expect(values["$"]).toEqual([]);
  });

  it("skips modifiers with no extract (?, the help modifier)", () => {
    expect(parseModifiers("title ?").values["?"]).toBeUndefined();
  });

  it("handles empty input", () => {
    expect(parseModifiers("")).toEqual({
      text: "",
      values: { "@": [], "!": [], "#": [], $: [], "%": [] },
      invalid: { "@": [], "!": [], "#": [], $: [], "%": [] },
    });
  });
});
