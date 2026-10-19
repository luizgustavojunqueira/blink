import { afterEach, describe, expect, it } from "vitest";
import {
  THEME_TOKENS,
  applyTheme,
  renderCustomThemes,
  type ThemeColors,
} from "./theme";

const colors = (value: string) =>
  Object.fromEntries(THEME_TOKENS.map((t) => [t, value])) as ThemeColors;

const styleText = () =>
  document.getElementById("blink-custom-themes")?.textContent ?? "";

describe("theme", () => {
  afterEach(() => {
    document.documentElement.className = "";
    document.getElementById("blink-custom-themes")?.remove();
  });

  it("applies the theme class to the root element", () => {
    applyTheme("nord");

    expect(document.documentElement.className).toBe("theme-nord");
  });

  it("replaces the previous theme class instead of stacking", () => {
    applyTheme("gruvbox");
    applyTheme("nord");

    expect(document.documentElement.className).toBe("theme-nord");
  });

  it("renders every token of every custom theme into one style element", () => {
    renderCustomThemes({ mine: colors("#111111"), other: colors("#222222") });

    expect(styleText()).toContain(".theme-mine{--bg:#111111;");
    expect(styleText()).toContain(".theme-other{");
    for (const t of THEME_TOKENS)
      expect(styleText()).toContain(`--${t}:#111111;`);
  });

  it("reuses the same style element on re-render", () => {
    renderCustomThemes({ mine: colors("#111111") });
    renderCustomThemes({});

    expect(document.querySelectorAll("#blink-custom-themes")).toHaveLength(1);
    expect(styleText()).toBe("");
  });
});
