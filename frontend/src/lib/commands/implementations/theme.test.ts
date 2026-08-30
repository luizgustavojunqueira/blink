import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../types";
import { themeCommand } from "./theme";
import { useUiStore } from "../../../stores/ui";

function fakeApp(): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: {
      findItem: vi.fn(),
      setField: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

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
  it("applies a valid theme through the app context", async () => {
    const app = fakeApp();
    const result = await themeCommand.execute!({ rawArgs: "catppuccin", app });

    expect(app.setTheme).toHaveBeenCalledWith("catppuccin");
    expect(result).toEqual({ shouldClearPrompt: true });
  });

  it("normalizes casing and surrounding whitespace", async () => {
    const app = fakeApp();
    await themeCommand.execute!({ rawArgs: "  NORD  ", app });

    expect(app.setTheme).toHaveBeenCalledWith("nord");
  });

  it("rejects an invalid theme without applying it", async () => {
    const app = fakeApp();
    const result = await themeCommand.execute!({ rawArgs: "banana", app });

    expect(app.setTheme).not.toHaveBeenCalled();
    expect(result?.message).toMatch(/invalid theme/i);
  });

  it("does not clear the prompt when the theme is invalid", async () => {
    const app = fakeApp();
    const result = await themeCommand.execute!({ rawArgs: "banana", app });

    expect(result?.shouldClearPrompt).toBeFalsy();
  });
});
