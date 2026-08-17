import { describe, expect, it } from "vitest";
import { statusModifier } from "./status";

describe("statusModifier.getOptions()", () => {
  it("filters by value, case-insensitively", () => {
    const options = statusModifier.getOptions!("to");
    expect(options.map((o) => o.value)).toEqual(["TODO"]);
  });

  it("returns every status when the filter is empty", () => {
    expect(statusModifier.getOptions!("")).toHaveLength(5);
  });

  it("tags every option with kind STATUS", () => {
    const options = statusModifier.getOptions!("");
    expect(options.every((o) => o.kind === "STATUS")).toBe(true);
  });
});

describe("statusModifier.extract()", () => {
  it("extracts valid statuses and drops invalid ones", () => {
    expect(statusModifier.extract!("title @banana @todo")).toEqual({
      values: ["todo"],
      remaining: "title",
    });
  });
});
