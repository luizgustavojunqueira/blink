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

  it("collapses repeated # markers before extracting, instead of keeping them in the value", () => {
    expect(tagModifier.extract!("title ###dev")).toEqual({
      values: ["dev"],
      invalid: [],
      remaining: "title",
    });
  });
});
