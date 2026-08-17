import { describe, expect, it } from "vitest";
import { priorityModifier } from "./priority";

describe("priorityModifier.getOptions()", () => {
  it("filters by value, case-insensitively", () => {
    const options = priorityModifier.getOptions!("hi");
    expect(options.map((o) => o.value)).toEqual(["HIGH"]);
  });

  it("returns every priority when the filter is empty", () => {
    expect(priorityModifier.getOptions!("")).toHaveLength(4);
  });

  it("tags every option with kind PRIORITY", () => {
    const options = priorityModifier.getOptions!("");
    expect(options.every((o) => o.kind === "PRIORITY")).toBe(true);
  });
});

describe("priorityModifier.extract()", () => {
  it("separates valid priorities from rejected ones", () => {
    expect(priorityModifier.extract!("title !custom !high")).toEqual({
      values: ["high"],
      invalid: ["custom"],
      remaining: "title",
    });
  });
});
