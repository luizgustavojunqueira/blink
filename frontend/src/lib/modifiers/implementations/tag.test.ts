import { describe, expect, it } from "vitest";
import { tagModifier } from "./tag";

describe("tagModifier", () => {
  it("has no value suggestions yet", () => {
    expect(tagModifier.getOptions!("")).toEqual([]);
  });

  it("extracts every tag occurrence, with no validity restriction", () => {
    expect(tagModifier.extract!("title #dev #golang")).toEqual({
      values: ["dev", "golang"],
      invalid: [],
      remaining: "title",
    });
  });
});
