import { describe, expect, it } from "vitest";
import { extractDelimited } from "./extract";

describe("extractDelimited()", () => {
  it("extracts every occurrence of the delimiter, lowercased", () => {
    expect(extractDelimited("title #Dev #Golang", "#")).toEqual({
      values: ["dev", "golang"],
      remaining: "title",
    });
  });

  it("filters out values not in the valid set", () => {
    expect(extractDelimited("title @banana @todo", "@", ["todo"])).toEqual({
      values: ["todo"],
      remaining: "title",
    });
  });

  it("ignores a bare delimiter with no value attached", () => {
    expect(extractDelimited("title #", "#")).toEqual({
      values: [],
      remaining: "title #",
    });
  });

  it("returns the input untouched when the delimiter never appears", () => {
    expect(extractDelimited("just a title", "#")).toEqual({
      values: [],
      remaining: "just a title",
    });
  });
});
