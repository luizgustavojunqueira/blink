import { describe, expect, it } from "vitest";
import { getAllCommands, getCommand } from "./registry";

describe("commands registry", () => {
  it("resolves a registered command by id", () => {
    expect(getCommand("theme")?.id).toBe("theme");
    expect(getCommand("filter")?.id).toBe("filter");
  });

  it("returns undefined for an unknown id", () => {
    expect(getCommand("nope")).toBeUndefined();
  });

  it("lists every registered command", () => {
    const ids = getAllCommands().map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["theme", "filter"]));
  });
});
