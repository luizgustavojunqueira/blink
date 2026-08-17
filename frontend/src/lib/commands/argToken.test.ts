import { describe, expect, it } from "vitest";
import { commandArgStart, currentArgToken } from "./argToken";

describe("currentArgToken()", () => {
  it("treats a single token with no space as the current token", () => {
    expect(currentArgToken("gruv")).toEqual({ done: "", current: "gruv" });
  });

  it("splits done/current on the last space", () => {
    expect(currentArgToken("group @todo")).toEqual({
      done: "group ",
      current: "@todo",
    });
  });

  it("treats a trailing space as an empty current token", () => {
    expect(currentArgToken("gruv ")).toEqual({ done: "gruv ", current: "" });
  });

  it("treats an empty string as an empty current token", () => {
    expect(currentArgToken("")).toEqual({ done: "", current: "" });
  });
});

describe("commandArgStart()", () => {
  it("is always 0 for a single-arg command, regardless of internal spaces", () => {
    expect(commandArgStart("gru", 1)).toBe(0);
    expect(commandArgStart("gr u", 1)).toBe(0);
    expect(commandArgStart("gru          ", 1)).toBe(0);
  });

  it("skips confirmed tokens for a multi-arg command", () => {
    expect(commandArgStart("group @sta", 2)).toBe("group ".length);
  });

  it("skips extra whitespace between confirmed tokens", () => {
    expect(commandArgStart("group   @sta", 2)).toBe("group   ".length);
  });

  it("doesn't advance past an argument that isn't confirmed yet (no trailing space)", () => {
    expect(commandArgStart("gro", 2)).toBe(0);
  });

  it("stops skipping once it runs out of confirmed tokens, however many slots remain", () => {
    expect(commandArgStart("group @sta", 3)).toBe("group ".length);
  });
});
