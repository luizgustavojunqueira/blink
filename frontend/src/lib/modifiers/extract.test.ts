import { describe, expect, it } from "vitest";
import { extractDelimited, extractRest } from "./extract";

describe("extractDelimited()", () => {
  it("extracts every occurrence of the delimiter, lowercased", () => {
    expect(extractDelimited("title #Dev #Golang", "#")).toEqual({
      values: ["dev", "golang"],
      invalid: [],
      remaining: "title",
    });
  });

  it("filters out values not in the valid set", () => {
    expect(extractDelimited("title @banana @todo", "@", ["todo"])).toEqual({
      values: ["todo"],
      invalid: ["banana"],
      remaining: "title",
    });
  });

  it("ignores a bare delimiter with no value attached", () => {
    expect(extractDelimited("title #", "#")).toEqual({
      values: [],
      invalid: [],
      remaining: "title #",
    });
  });

  it("returns the input untouched when the delimiter never appears", () => {
    expect(extractDelimited("just a title", "#")).toEqual({
      values: [],
      invalid: [],
      remaining: "just a title",
    });
  });
});

describe("extractRest()", () => {
  it("takes everything after the delimiter as one value", () => {
    expect(extractRest("title $ the description", "$")).toEqual({
      values: ["the description"],
      invalid: [],
      remaining: "title",
    });
  });

  it("preserves case", () => {
    expect(extractRest("t $ Ship It", "$")).toEqual({
      values: ["Ship It"],
      invalid: [],
      remaining: "t",
    });
  });

  it("stops at the first delimiter, keeping later ones inside the value", () => {
    expect(extractRest("t $ a $ b", "$")).toEqual({
      values: ["a $ b"],
      invalid: [],
      remaining: "t",
    });
  });

  it("yields no value for a trailing bare delimiter", () => {
    expect(extractRest("title $", "$")).toEqual({
      values: [],
      invalid: [],
      remaining: "title",
    });
  });

  it("returns the input untouched when the delimiter never appears", () => {
    expect(extractRest("just a title", "$")).toEqual({
      values: [],
      invalid: [],
      remaining: "just a title",
    });
  });
});
