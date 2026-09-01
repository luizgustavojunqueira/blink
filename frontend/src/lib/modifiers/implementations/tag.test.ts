import { describe, expect, it } from "vitest";
import { tagModifier } from "./tag";

describe("tagModifier", () => {
  it("returns empty array when no options are provided", () => {
    expect(tagModifier.getOptions!("")).toEqual([]);
  });

  it("filters tags matching the query case-insensitively", () => {
    const options = { tags: ["work", "weekend", "personal"] };
    const res = tagModifier.getOptions!("wo", options);
    expect(res.map((r) => r.value)).toEqual(["work"]);
  });

  it("returns all tags when query is empty", () => {
    const options = { tags: ["work", "personal"] };
    const res = tagModifier.getOptions!("", options);
    expect(res.map((r) => r.value)).toEqual(["work", "personal"]);
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
