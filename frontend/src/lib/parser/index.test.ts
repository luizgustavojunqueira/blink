import { describe, expect, it } from "vitest";
import { parse } from ".";
import { COMMAND_PREFIX } from "../commands/registry";

describe("parse()", () => {
  it("resolves to the filter command by default", () => {
    const result = parse("build blink");
    expect(result).toEqual({ id: "filter", rawArgs: "build blink" });
  });

  it("returns the filter command with empty rawArgs when input is empty", () => {
    const result = parse("");
    expect(result).toEqual({ id: "filter", rawArgs: "" });
  });

  it("resolves a registered command", () => {
    const result = parse(`${COMMAND_PREFIX}theme dark`);
    expect(result).toEqual({ id: "theme", rawArgs: "dark" });
  });

  it("resolves a registered command with no args", () => {
    const result = parse(`${COMMAND_PREFIX}theme`);
    expect(result).toEqual({ id: "theme", rawArgs: "" });
  });

  it("falls back to the filter command for an unknown command", () => {
    const raw = `${COMMAND_PREFIX}doesnotexist foo`;
    const result = parse(raw);
    expect(result).toEqual({ id: "filter", rawArgs: raw });
  });
});
