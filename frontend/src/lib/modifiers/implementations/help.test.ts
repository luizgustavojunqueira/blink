import { describe, expect, it } from "vitest";
import { helpModifier } from "./help";

describe("helpModifier.getOptions()", () => {
  it("lists every other modifier", () => {
    const values = helpModifier.getOptions!("").map((o) => o.value);
    expect(values).toEqual(expect.arrayContaining(["@", "!", "#", "$"]));
  });

  it("does not list itself", () => {
    const values = helpModifier.getOptions!("").map((o) => o.value);
    expect(values).not.toContain("?");
  });

  it("derives descriptions from the modifiers registry, not hardcoded copies", () => {
    const at = helpModifier.getOptions!("").find((o) => o.value === "@");
    expect(at?.description).toBe("Filter by status");
  });
});
