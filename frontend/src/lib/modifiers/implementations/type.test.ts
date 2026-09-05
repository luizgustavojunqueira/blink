import { describe, expect, it } from "vitest";
import { typeModifier } from "./type";

describe("typeModifier.getOptions()", () => {
  it("filters by value, case-insensitively", () => {
    const options = typeModifier.getOptions!("gro");
    expect(options.map((o) => o.value)).toEqual(["GROUP"]);
  });

  it("returns every type when the filter is empty", () => {
    expect(typeModifier.getOptions!("")).toHaveLength(2);
  });

  it("tags every option with kind TYPE", () => {
    const options = typeModifier.getOptions!("");
    expect(options.every((o) => o.kind === "TYPE")).toBe(true);
  });
});

describe("typeModifier.extract()", () => {
  it("separates valid types from rejected ones", () => {
    expect(typeModifier.extract!("title =banana =group")).toEqual({
      values: ["group"],
      invalid: ["banana"],
      remaining: "title",
    });
  });
});
