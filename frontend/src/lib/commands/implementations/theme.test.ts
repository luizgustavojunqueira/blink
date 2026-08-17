import { afterEach, describe, expect, it } from "vitest";
import { themeCommand } from "./theme";

describe("themeCommand.getOptions()", () => {
  it("filters themes by the current (last) arg token", () => {
    const options = themeCommand.getOptions!("c");
    expect(options.map((o) => o.value)).toEqual(["catppuccin"]);
  });

  it("returns all themes when the current token is empty", () => {
    const options = themeCommand.getOptions!("");
    expect(options).toHaveLength(3);
  });

  it("only considers the token after the last space, ignoring earlier stale text", () => {
    const options = themeCommand.getOptions!("gruv          ");
    expect(options).toHaveLength(3);
  });
});

describe("themeCommand.execute()", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("applies a valid theme", async () => {
    const result = await themeCommand.execute!({ rawArgs: "catppuccin" });

    expect(document.documentElement.className).toBe("theme-catppuccin");
    expect(localStorage.getItem("theme")).toBe("catppuccin");
    expect(result).toEqual({ shouldClearPrompt: true });
  });

  it("rejects an invalid theme without applying it", async () => {
    const result = await themeCommand.execute!({ rawArgs: "banana" });

    expect(document.documentElement.className).toBe("");
    expect(localStorage.getItem("theme")).toBeNull();
    expect(result?.message).toMatch(/invalid theme/i);
  });
});
