import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../types";
import { THEMES, themeCommand } from "./theme";
import { useUiStore } from "../../../stores/ui";
import { defaultConfig, useConfigStore } from "../../config/store";

const A_THEME = THEMES[0];

function fakeApp(): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    config: {} as AppContext["config"],
    items: {
      findItem: vi.fn(),
      setField: vi.fn(),
      bulkSetFields: vi.fn(),
      remove: vi.fn(),
      undo: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("themeCommand.getOptions()", () => {
  it("filters themes by the current (last) arg token", () => {
    const token = A_THEME.slice(0, 3);
    const options = themeCommand.getOptions!(token);

    expect(options.map((o) => o.value)).toEqual(THEMES.filter((t) => t.includes(token)));
    expect(options.map((o) => o.value)).toContain(A_THEME);
  });

  it("drops themes that do not match the current token", () => {
    const options = themeCommand.getOptions!(A_THEME);

    expect(options.map((o) => o.value)).toEqual([A_THEME]);
  });

  it("returns all themes when the current token is empty", () => {
    const options = themeCommand.getOptions!("");
    expect(options).toHaveLength(THEMES.length);
  });

  it("only considers the token after the last space, ignoring earlier stale text", () => {
    const options = themeCommand.getOptions!(`${A_THEME.slice(0, 4)}          `);
    expect(options).toHaveLength(THEMES.length);
  });
});

describe("themeCommand.execute()", () => {
  it("applies a valid theme through the app context", async () => {
    const app = fakeApp();
    const result = await themeCommand.execute!({ rawArgs: A_THEME, app });

    expect(app.setTheme).toHaveBeenCalledWith(A_THEME);
    expect(result).toEqual({ shouldClearPrompt: true });
  });

  it("normalizes casing and surrounding whitespace", async () => {
    const app = fakeApp();
    await themeCommand.execute!({ rawArgs: `  ${A_THEME.toUpperCase()}  `, app });

    expect(app.setTheme).toHaveBeenCalledWith(A_THEME);
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

describe("themeCommand with custom themes", () => {
  afterEach(() => {
    useConfigStore.setState(defaultConfig());
  });

  it("offers and accepts custom themes next to the built-in ones", async () => {
    useConfigStore.getState().duplicateTheme(A_THEME);
    const custom = `${A_THEME}-copy`;
    const app = fakeApp();

    expect(themeCommand.getOptions!("").map((o) => o.value)).toContain(custom);
    await themeCommand.execute!({ rawArgs: custom, app });

    expect(app.setTheme).toHaveBeenCalledWith(custom);
  });
});
