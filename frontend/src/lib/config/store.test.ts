import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_THEME_KEY,
  STORAGE_KEY,
  bootConfig,
  defaultConfig,
  loadConfig,
  sanitizeConfig,
  useConfigStore,
} from "./store";
import { configRows } from "./rows";
import { THEME_TOKENS, type ThemeColors } from "../theme";
import { applyKeymap, resolve } from "../keymap/registry";
import { createRootPane } from "../pane/factories";
import type { KeyQueryContext } from "../keymap/types";
import { getLocale } from "../i18n";

const store = () => useConfigStore.getState();

const colors = (value = "#111111") =>
  Object.fromEntries(THEME_TOKENS.map((t) => [t, value])) as ThemeColors;

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

const listCtx = (): KeyQueryContext => {
  const pane = createRootPane();
  return {
    ui: { mode: "normal", panes: [pane], activePaneId: pane.id },
    pane,
  } as KeyQueryContext;
};

beforeEach(() => {
  useConfigStore.setState(defaultConfig());
  localStorage.clear();
});

afterEach(() => {
  applyKeymap({});
  document.documentElement.className = "";
  document.getElementById("blink-custom-themes")?.remove();
});

describe("config store: theme", () => {
  it("applies and saves a valid theme", () => {
    expect(store().setTheme("nord")).toBeNull();

    expect(document.documentElement.className).toBe("theme-nord");
    expect(saved().theme).toBe("nord");
  });

  it("refuses an unknown theme and keeps the current one", () => {
    expect(store().setTheme("banana")).toMatch(/unknown/);
    expect(store().theme).toBe("gruvbox");
  });

  it("copies a custom theme into a new active one", () => {
    useConfigStore.setState({
      themes: { mine: colors("#123456") },
      theme: "mine",
    });

    const name = store().duplicateTheme("mine");

    expect(name).toBe("mine-copy");
    expect(store().themes["mine-copy"]).toEqual(colors("#123456"));
    expect(store().theme).toBe("mine-copy");
    expect(
      document.getElementById("blink-custom-themes")?.textContent,
    ).toContain(".theme-mine-copy{");
  });

  it("copies a built-in theme with a valid color for every token", () => {
    const name = store().duplicateTheme("nord")!;

    for (const t of THEME_TOKENS)
      expect(store().themes[name][t]).toMatch(/^#[0-9a-f]{3,8}$/);
  });

  it("never reuses a name when copying", () => {
    expect(store().duplicateTheme("nord")).toBe("nord-copy");
    expect(store().duplicateTheme("nord")).toBe("nord-copy-2");
    expect(store().duplicateTheme("banana")).toBeNull();
  });

  it("renames a custom theme and follows it when it is active", () => {
    useConfigStore.setState({ themes: { mine: colors() }, theme: "mine" });

    expect(store().renameTheme("mine", "  My Dark ")).toBeNull();

    expect(Object.keys(store().themes)).toEqual(["my-dark"]);
    expect(store().theme).toBe("my-dark");
    expect(document.documentElement.className).toBe("theme-my-dark");
  });

  it("refuses names that break the theme class or collide", () => {
    useConfigStore.setState({ themes: { mine: colors(), other: colors() } });

    expect(store().renameTheme("mine", "nord")).toMatch(/already exists/);
    expect(store().renameTheme("mine", "other")).toMatch(/already exists/);
    expect(store().renameTheme("mine", "a}b")).toMatch(/a-z/);
    expect(store().renameTheme("mine", "")).toMatch(/a-z/);
    expect(store().renameTheme("mine", "x".repeat(33))).toMatch(/a-z/);
    expect(store().renameTheme("nord", "x")).toMatch(/only custom/);
    expect(Object.keys(store().themes)).toEqual(["mine", "other"]);
  });

  it("deletes a custom theme and falls back to the default when it was active", () => {
    useConfigStore.setState({ themes: { mine: colors() }, theme: "mine" });

    store().deleteTheme("mine");

    expect(store().themes).toEqual({});
    expect(store().theme).toBe("gruvbox");
  });

  it("never deletes a built-in theme", () => {
    store().deleteTheme("nord");

    expect(store().setTheme("nord")).toBeNull();
  });

  it("edits a color, accepting it with or without #", () => {
    useConfigStore.setState({ themes: { mine: colors() } });

    expect(store().setThemeColor("mine", "bg", "ABCDEF")).toBeNull();
    expect(store().setThemeColor("mine", "fg", "#fff")).toBeNull();

    expect(store().themes.mine.bg).toBe("#abcdef");
    expect(store().themes.mine.fg).toBe("#fff");
  });

  it("refuses anything that is not a hex color, so nothing leaks into the stylesheet", () => {
    useConfigStore.setState({ themes: { mine: colors() } });

    expect(store().setThemeColor("mine", "bg", "red")).toMatch(/hex/);
    expect(
      store().setThemeColor("mine", "bg", "#111;}body{display:none"),
    ).toMatch(/hex/);
    expect(store().setThemeColor("nord", "bg", "#111111")).toMatch(
      /only custom/,
    );
    expect(store().themes.mine.bg).toBe("#111111");
  });
});

describe("config store: keys", () => {
  it("remaps a binding live and saves only the change", () => {
    expect(store().setKeys("list:down", "n, arrowdown")).toBeNull();

    expect(resolve("n", listCtx())?.id).toBe("list:down");
    expect(saved().keymap).toEqual({ "list:down": ["n", "arrowdown"] });
  });

  it("refuses conflicts and explains them", () => {
    expect(store().setKeys("list:down", "k")).toMatch(
      /"k" is already used by "Move up"/,
    );
    expect(store().setKeys("list:top", "z, z z")).toMatch(/hide/);
    expect(store().keymap).toEqual({});
  });

  it("refuses invalid keys", () => {
    expect(store().setKeys("list:down", "banana")).toMatch(/not a key/);
    expect(store().keymap).toEqual({});
  });

  it("refuses fixed and unknown bindings", () => {
    expect(store().setKeys("escape", "q")).toMatch(/can't be changed/);
    expect(store().setKeys("config:down", "q")).toMatch(/can't be changed/);
    expect(store().setKeys("nope", "q")).toMatch(/unknown/);
  });

  it("drops the override when the input is empty or equal to the default", () => {
    store().setKeys("list:down", "n");
    expect(store().setKeys("list:down", "")).toBeNull();
    expect(store().keymap).toEqual({});

    store().setKeys("list:down", "n");
    expect(store().setKeys("list:down", "j, arrowdown")).toBeNull();
    expect(store().keymap).toEqual({});
    expect(resolve("j", listCtx())?.id).toBe("list:down");
  });

  it("resets a binding to its default", () => {
    store().setKeys("list:down", "n");

    store().resetKeys("list:down");

    expect(store().keymap).toEqual({});
    expect(resolve("j", listCtx())?.id).toBe("list:down");
  });
});

describe("config store: animations", () => {
  it("defaults to auto", () => {
    expect(store().animations).toBe("auto");
  });

  it("accepts auto, on and off, and saves the choice", () => {
    for (const value of ["on", "off", "auto"]) {
      expect(store().setAnimations(value)).toBeNull();
      expect(store().animations).toBe(value);
      expect(saved().animations).toBe(value);
    }
  });

  it("refuses anything else", () => {
    expect(store().setAnimations("fast")).toMatch(/auto, on or off/);
    expect(store().animations).toBe("auto");
  });

  it("marks the page with the effective motion", () => {
    store().setAnimations("off");
    expect(document.documentElement.dataset.motion).toBe("off");

    store().setAnimations("on");
    expect(document.documentElement.dataset.motion).toBe("on");
  });

  it("falls back to auto when the saved value is invalid", () => {
    expect(sanitizeConfig({ animations: "sometimes" }).animations).toBe("auto");
    expect(sanitizeConfig({ animations: "off" }).animations).toBe("off");
  });
});

describe("config store: rows", () => {
  it("lists themes, then the colors of the active custom theme, then the keys", () => {
    useConfigStore.setState({ themes: { mine: colors() }, theme: "mine" });

    const kinds = configRows(store()).map((r) => r.kind);

    expect(kinds.filter((k) => k === "theme")).toHaveLength(6);
    expect(kinds.filter((k) => k === "color")).toHaveLength(
      THEME_TOKENS.length,
    );
    expect(kinds.indexOf("color")).toBeGreaterThan(kinds.lastIndexOf("theme"));
    expect(kinds.indexOf("key")).toBeGreaterThan(kinds.lastIndexOf("color"));
  });

  it("hides colors for built-in themes and never lists fixed bindings", () => {
    const rows = configRows(store());

    expect(rows.some((r) => r.kind === "color")).toBe(false);
    expect(rows.some((r) => r.kind === "key" && r.binding.fixed)).toBe(false);
    expect(
      rows.some((r) => r.kind === "key" && r.binding.scope === "config"),
    ).toBe(false);
  });
});

describe("config store: persistence", () => {
  it("round-trips through storage", () => {
    store().duplicateTheme("nord");
    store().setKeys("list:down", "n");

    expect(loadConfig()).toEqual({
      theme: store().theme,
      themes: store().themes,
      keymap: store().keymap,
      animations: "auto",
      language: "auto",
    });
  });

  it("falls back to defaults on broken storage", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");

    expect(loadConfig()).toEqual(defaultConfig());
  });

  it("drops whatever does not validate and keeps the rest", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: "ghost",
        keymap: { "list:down": ["n"], "list:up": ["nope"], "list:top": "g g" },
        themes: {
          mine: colors(),
          nord: colors(),
          "bad name": colors(),
          partial: { bg: "#111111" },
          evil: { ...colors(), bg: "red;}" },
        },
      }),
    );

    expect(loadConfig()).toEqual({
      theme: "gruvbox",
      keymap: { "list:down": ["n"] },
      themes: { mine: colors() },
      animations: "auto",
      language: "auto",
    });
  });

  it("picks up the theme saved by older versions", () => {
    localStorage.setItem(LEGACY_THEME_KEY, "nord");

    expect(loadConfig().theme).toBe("nord");
  });

  it("applies everything on boot", () => {
    useConfigStore.setState({
      themes: { mine: colors() },
      theme: "mine",
      keymap: { "list:down": ["n"] },
    });
    document.documentElement.className = "";
    applyKeymap({});

    bootConfig();

    expect(document.documentElement.className).toBe("theme-mine");
    expect(
      document.getElementById("blink-custom-themes")?.textContent,
    ).toContain(".theme-mine{");
    expect(resolve("n", listCtx())?.id).toBe("list:down");
  });
});

describe("config store: language", () => {
  afterEach(() => {
    store().setLanguage("auto");
  });

  it("defaults to auto", () => {
    expect(store().language).toBe("auto");
  });

  it("accepts auto, en and pt, and saves the choice", () => {
    for (const value of ["pt", "en", "auto"]) {
      expect(store().setLanguage(value)).toBeNull();
      expect(store().language).toBe(value);
      expect(saved().language).toBe(value);
    }
  });

  it("refuses anything else", () => {
    expect(store().setLanguage("fr")).toMatch(/auto, en, pt/);
    expect(store().language).toBe("auto");
  });

  it("switches the interface language", () => {
    store().setLanguage("pt");
    expect(getLocale()).toBe("pt");
    expect(document.documentElement.lang).toBe("pt-BR");

    store().setLanguage("en");
    expect(getLocale()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("falls back to auto when the saved value is invalid", () => {
    expect(sanitizeConfig({ language: "klingon" }).language).toBe("auto");
    expect(sanitizeConfig({ language: "pt" }).language).toBe("pt");
  });
});
