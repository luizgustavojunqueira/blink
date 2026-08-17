import { describe, expect, it } from "vitest";
import { parse } from ".";

describe("parse()", () => {
  it("resolves to the filter command by default", () => {
    const result = parse("build blink");
    expect(result).toEqual({ id: "filter", rawArgs: "build blink" });
  });

  it("returns the filter command with empty rawArgs when input is empty", () => {
    const result = parse("");
    expect(result).toEqual({ id: "filter", rawArgs: "" });
  });

  it("resolves a registered slash command", () => {
    const result = parse("/theme dark");
    expect(result).toEqual({ id: "theme", rawArgs: "dark" });
  });

  it("resolves a registered slash command with no args", () => {
    const result = parse("/theme");
    expect(result).toEqual({ id: "theme", rawArgs: "" });
  });

  it("falls back to the filter command for an unknown slash command", () => {
    const result = parse("/doesnotexist foo");
    expect(result).toEqual({ id: "filter", rawArgs: "/doesnotexist foo" });
  });
});
